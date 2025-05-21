import type { Book, LendingRecord, Notification } from '@/lib/types';
import { addDays } from 'date-fns';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const LENDING_PERIOD_DAYS = 14;
export const MAX_BORROW_LIMIT = 3;

// Book Functions
export const getBooks = async (): Promise<Book[]> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT s.ID as id, s.TieuDe as name, tls.Name as type,
             s.TacGia as author, s.NhaXuatBan as publisher,
             s.Nam as publishYear, tk.LuotMuon as borrowedCount,
             COUNT(sm.IDSach) as quantity
      FROM sach s
      JOIN theloaisach tls ON s.IDTheLoaiSach = tls.ID
      LEFT JOIN thongke tk ON s.ID = tk.IDSach
      LEFT JOIN sachmuon sm ON s.ID = sm.IDSach
      GROUP BY s.ID
    `);

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      quantity: row.quantity || 1,
      author: row.author,
      publisher: row.publisher,
      publishYear: row.publishYear,
      importDate: new Date(), // Default to current date since there's no direct equivalent
      borrowedCount: row.borrowedCount || 0
    }));
  } catch (error) {
    console.error('Error getting books:', error);
    throw error;
  }
};

export const addBook = async (book: Omit<Book, 'id' | 'importDate' | 'borrowedCount'> & { importDate: string | Date }): Promise<Book> => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if the book category exists, if not create it
      const [categoryRows] = await connection.query<RowDataPacket[]>(
        'SELECT ID FROM theloaisach WHERE Name = ?',
        [book.type]
      );

      let categoryId: string;

      if (categoryRows.length === 0) {
        // Create a new category
        const categoryIdPrefix = 'TL';
        const [maxIdResult] = await connection.query<RowDataPacket[]>(
          'SELECT MAX(ID) as maxId FROM theloaisach WHERE ID LIKE ?',
          [`${categoryIdPrefix}%`]
        );

        const maxId = maxIdResult[0].maxId || `${categoryIdPrefix}000`;
        const numericPart = parseInt(maxId.substring(categoryIdPrefix.length)) + 1;
        categoryId = `${categoryIdPrefix}${numericPart.toString().padStart(3, '0')}`;

        await connection.query(
          'INSERT INTO theloaisach (ID, Name, Sum) VALUES (?, ?, ?)',
          [categoryId, book.type, 1]
        );
      } else {
        categoryId = categoryRows[0].ID;

        // Update the Sum in theloaisach
        await connection.query(
          'UPDATE theloaisach SET Sum = Sum + 1 WHERE ID = ?',
          [categoryId]
        );
      }

      // Generate a new book ID
      const bookIdPrefix = 'S';
      const [maxBookIdResult] = await connection.query<RowDataPacket[]>(
        'SELECT MAX(ID) as maxId FROM sach WHERE ID LIKE ?',
        [`${bookIdPrefix}%`]
      );

      const maxBookId = maxBookIdResult[0].maxId || `${bookIdPrefix}000`;
      const numericPart = parseInt(maxBookId.substring(bookIdPrefix.length)) + 1;
      const bookId = `${bookIdPrefix}${numericPart.toString().padStart(3, '0')}`;

      // Insert the book
      await connection.query(
        'INSERT INTO sach (ID, TieuDe, NhaXuatBan, TacGia, Nam, IDTheLoaiSach) VALUES (?, ?, ?, ?, ?, ?)',
        [bookId, book.name, book.publisher, book.author, book.publishYear, categoryId]
      );

      // Initialize the book in thongke
      await connection.query(
        'INSERT INTO thongke (IDSach, LuotMuon) VALUES (?, ?)',
        [bookId, 0]
      );

      await connection.commit();

      return {
        ...book,
        id: bookId,
        importDate: new Date(),
        borrowedCount: 0
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding book:', error);
    throw error;
  }
};

export const getBookById = async (id: string): Promise<Book | undefined> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT s.ID as id, s.TieuDe as name, tls.Name as type,
             s.TacGia as author, s.NhaXuatBan as publisher,
             s.Nam as publishYear, tk.LuotMuon as borrowedCount,
             COUNT(sm.IDSach) as quantity
      FROM sach s
      JOIN theloaisach tls ON s.IDTheLoaiSach = tls.ID
      LEFT JOIN thongke tk ON s.ID = tk.IDSach
      LEFT JOIN sachmuon sm ON s.ID = sm.IDSach
      WHERE s.ID = ?
      GROUP BY s.ID
    `, [id]);

    if (rows.length === 0) {
      return undefined;
    }

    const row = rows[0];
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      quantity: row.quantity || 1,
      author: row.author,
      publisher: row.publisher,
      publishYear: row.publishYear,
      importDate: new Date(), // Default to current date since there's no direct equivalent
      borrowedCount: row.borrowedCount || 0
    };
  } catch (error) {
    console.error('Error getting book by ID:', error);
    throw error;
  }
};

export const updateBook = async (id: string, updatedBookData: Omit<Book, 'id' | 'importDate' | 'borrowedCount'> & { importDate: string | Date, borrowedCount?: number }): Promise<Book | null> => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if the book exists
      const book = await getBookById(id);
      if (!book) {
        return null;
      }

      // Check if the category exists, if not create it
      const [categoryRows] = await connection.query<RowDataPacket[]>(
        'SELECT ID FROM theloaisach WHERE Name = ?',
        [updatedBookData.type]
      );

      let categoryId: string;

      if (categoryRows.length === 0) {
        // Create a new category
        const categoryIdPrefix = 'TL';
        const [maxIdResult] = await connection.query<RowDataPacket[]>(
          'SELECT MAX(ID) as maxId FROM theloaisach WHERE ID LIKE ?',
          [`${categoryIdPrefix}%`]
        );

        const maxId = maxIdResult[0].maxId || `${categoryIdPrefix}000`;
        const numericPart = parseInt(maxId.substring(categoryIdPrefix.length)) + 1;
        categoryId = `${categoryIdPrefix}${numericPart.toString().padStart(3, '0')}`;

        await connection.query(
          'INSERT INTO theloaisach (ID, Name, Sum) VALUES (?, ?, ?)',
          [categoryId, updatedBookData.type, 1]
        );
      } else {
        categoryId = categoryRows[0].ID;
      }

      // Get the current category ID
      const [currentCategoryResult] = await connection.query<RowDataPacket[]>(
        'SELECT IDTheLoaiSach FROM sach WHERE ID = ?',
        [id]
      );

      const currentCategoryId = currentCategoryResult[0].IDTheLoaiSach;

      // Update the book
      await connection.query(
        'UPDATE sach SET TieuDe = ?, NhaXuatBan = ?, TacGia = ?, Nam = ?, IDTheLoaiSach = ? WHERE ID = ?',
        [updatedBookData.name, updatedBookData.publisher, updatedBookData.author, updatedBookData.publishYear, categoryId, id]
      );

      // Update category counts if the category changed
      if (currentCategoryId !== categoryId) {
        await connection.query(
          'UPDATE theloaisach SET Sum = Sum - 1 WHERE ID = ?',
          [currentCategoryId]
        );

        await connection.query(
          'UPDATE theloaisach SET Sum = Sum + 1 WHERE ID = ?',
          [categoryId]
        );
      }

      await connection.commit();

      return {
        ...updatedBookData,
        id,
        importDate: new Date(),
        borrowedCount: updatedBookData.borrowedCount !== undefined ? updatedBookData.borrowedCount : book.borrowedCount
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
};

export const deleteBook = async (id: string): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if the book is currently borrowed
      const [activeLoans] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count
         FROM sachmuon sm
         JOIN luotmuon lm ON sm.IDLuotMuon = lm.ID
         WHERE sm.IDSach = ? AND lm.NgayTra IS NULL`,
        [id]
      );

      if (activeLoans[0].count > 0) {
        return false; // Book is currently borrowed
      }

      // Get the category ID before deleting the book
      const [categoryResult] = await connection.query<RowDataPacket[]>(
        'SELECT IDTheLoaiSach FROM sach WHERE ID = ?',
        [id]
      );

      if (categoryResult.length === 0) {
        return false; // Book not found
      }

      const categoryId = categoryResult[0].IDTheLoaiSach;

      // Delete from thongke
      await connection.query('DELETE FROM thongke WHERE IDSach = ?', [id]);

      // Delete from sachmuon
      await connection.query('DELETE FROM sachmuon WHERE IDSach = ?', [id]);

      // Delete the book
      const [result] = await connection.query<ResultSetHeader>('DELETE FROM sach WHERE ID = ?', [id]);

      // Update the category count
      await connection.query(
        'UPDATE theloaisach SET Sum = Sum - 1 WHERE ID = ?',
        [categoryId]
      );

      await connection.commit();

      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
};

// Lending Record Functions
export const getLendingRecords = async (readerId?: string): Promise<LendingRecord[]> => {
  try {
    let query = `
      SELECT lm.ID as id, sm.IDSach as bookId, s.TieuDe as bookName,
             bd.ID as readerId, lm.NgayMuon as borrowDate,
             lm.NgayCanTra as dueDate, lm.NgayTra as returnDate
      FROM luotmuon lm
      JOIN bandoc bd ON lm.IDBanDoc = bd.ID
      JOIN sachmuon sm ON lm.ID = sm.IDLuotMuon
      JOIN sach s ON sm.IDSach = s.ID
    `;

    let params: any[] = [];

    if (readerId) {
      query += ' WHERE bd.ID = ?';
      params.push(readerId);
    }

    query += ' ORDER BY lm.NgayMuon DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => ({
      id: row.id,
      bookId: row.bookId,
      bookName: row.bookName,
      readerId: row.readerId,
      borrowDate: new Date(row.borrowDate),
      dueDate: new Date(row.dueDate),
      returnDate: row.returnDate ? new Date(row.returnDate) : null
    }));
  } catch (error) {
    console.error('Error getting lending records:', error);
    throw error;
  }
};

export const getLendingRecordById = async (id: number): Promise<LendingRecord | undefined> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT lm.ID as id, sm.IDSach as bookId, s.TieuDe as bookName,
             bd.ID as readerId, lm.NgayMuon as borrowDate,
             lm.NgayCanTra as dueDate, lm.NgayTra as returnDate
      FROM luotmuon lm
      JOIN bandoc bd ON lm.IDBanDoc = bd.ID
      JOIN sachmuon sm ON lm.ID = sm.IDLuotMuon
      JOIN sach s ON sm.IDSach = s.ID
      WHERE lm.ID = ?
    `, [id]);

    if (rows.length === 0) {
      return undefined;
    }

    const row = rows[0];
    return {
      id: row.id,
      bookId: row.bookId,
      bookName: row.bookName,
      readerId: row.readerId,
      borrowDate: new Date(row.borrowDate),
      dueDate: new Date(row.dueDate),
      returnDate: row.returnDate ? new Date(row.returnDate) : null
    };
  } catch (error) {
    console.error('Error getting lending record by ID:', error);
    throw error;
  }
};

export const addLendingRecord = async (recordData: Omit<LendingRecord, 'id' | 'dueDate'>): Promise<LendingRecord> => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if the reader exists
      const [readerRows] = await connection.query<RowDataPacket[]>(
        'SELECT ID FROM bandoc WHERE ID = ?',
        [recordData.readerId]
      );

      if (readerRows.length === 0) {
        throw new Error('Reader not found');
      }

      // Check if the book exists
      const [bookRows] = await connection.query<RowDataPacket[]>(
        'SELECT ID, TieuDe FROM sach WHERE ID = ?',
        [recordData.bookId]
      );

      if (bookRows.length === 0) {
        throw new Error('Book not found');
      }

      const bookName = bookRows[0].TieuDe;

      // Get a librarian ID (using the first one for simplicity)
      const [librarianRows] = await connection.query<RowDataPacket[]>(
        'SELECT ID FROM thuthu LIMIT 1'
      );

      if (librarianRows.length === 0) {
        throw new Error('No librarian found in the system');
      }

      const librarianId = librarianRows[0].ID;

      // Calculate due date
      const borrowDate = new Date(recordData.borrowDate);
      const dueDate = addDays(borrowDate, LENDING_PERIOD_DAYS);

      // Create the lending record
      const [lendingResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO luotmuon (IDBanDoc, IDThuThu, NgayMuon, NgayCanTra, NgayTra, TrangThai) VALUES (?, ?, ?, ?, NULL, ?)',
        [recordData.readerId, librarianId, borrowDate, dueDate, 'Đang mượn']
      );

      const lendingId = lendingResult.insertId;

      // Create the book-lending relationship
      await connection.query(
        'INSERT INTO sachmuon (IDSach, IDLuotMuon) VALUES (?, ?)',
        [recordData.bookId, lendingId]
      );

      // Update the book's borrow count in thongke
      await connection.query(
        'UPDATE thongke SET LuotMuon = LuotMuon + 1 WHERE IDSach = ?',
        [recordData.bookId]
      );

      await connection.commit();

      return {
        id: lendingId,
        bookId: recordData.bookId,
        bookName,
        readerId: recordData.readerId,
        borrowDate,
        dueDate,
        returnDate: null
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding lending record:', error);
    throw error;
  }
};

export const returnLendingRecord = async (id: number): Promise<LendingRecord | null> => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get the record first
      const record = await getLendingRecordById(id);
      if (!record || record.returnDate !== null) {
        return null;
      }

      const returnDate = new Date();

      // Update the record
      await connection.query(
        'UPDATE luotmuon SET NgayTra = ?, TrangThai = ? WHERE ID = ?',
        [returnDate, 'Đã trả', id]
      );

      await connection.commit();

      return {
        ...record,
        returnDate
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error returning lending record:', error);
    throw error;
  }
};

// Notification Functions
export const addNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification> => {
  try {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get the reader ID from the email
      const [readerRows] = await connection.query<RowDataPacket[]>(
        'SELECT ID FROM bandoc WHERE ID = ?',
        [notificationData.userId]
      );

      let readerId: string;

      if (readerRows.length === 0) {
        // Create a dummy reader for this notification
        const readerIdPrefix = 'BD';
        const [maxIdResult] = await connection.query<RowDataPacket[]>(
          'SELECT MAX(ID) as maxId FROM bandoc WHERE ID LIKE ?',
          [`${readerIdPrefix}%`]
        );

        const maxId = maxIdResult[0].maxId || `${readerIdPrefix}000`;
        const numericPart = parseInt(maxId.substring(readerIdPrefix.length)) + 1;
        readerId = `${readerIdPrefix}${numericPart.toString().padStart(3, '0')}`;

        await connection.query(
          'INSERT INTO bandoc (ID, Ten) VALUES (?, ?)',
          [readerId, notificationData.userId]
        );
      } else {
        readerId = readerRows[0].ID;
      }

      const timestamp = new Date();

      // Insert the notification
      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO thongbao (IDBanDoc, NoiDung, NgayThongBao) VALUES (?, ?, ?)',
        [readerId, notificationData.message, timestamp]
      );

      await connection.commit();

      return {
        ...notificationData,
        id: result.insertId,
        timestamp,
        isRead: false
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
};

export const getNotificationsByUserId = async (userId: string): Promise<Notification[]> => {
  try {
    // Get the reader ID from the email
    const [readerRows] = await pool.query<RowDataPacket[]>(
      'SELECT ID FROM bandoc WHERE ID = ?',
      [userId]
    );

    if (readerRows.length === 0) {
      return []; // No reader found
    }

    const readerId = readerRows[0].ID;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tb.IDthongbao as id, tb.IDBanDoc as userId, tb.NoiDung as message,
              'general' as type, tb.NgayThongBao as timestamp,
              FALSE as isRead
       FROM thongbao tb
       WHERE tb.IDBanDoc = ?
       ORDER BY tb.NgayThongBao DESC`,
      [readerId]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      message: row.message,
      type: row.type,
      timestamp: new Date(row.timestamp),
      isRead: Boolean(row.isRead)
    }));
  } catch (error) {
    console.error('Error getting notifications by user ID:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: number): Promise<Notification | null> => {
  try {
    // Since we don't have an isRead field in thongbao, we'll just return the notification
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT tb.IDthongbao as id, tb.IDBanDoc as userId, tb.NoiDung as message,
              'general' as type, tb.NgayThongBao as timestamp
       FROM thongbao tb
       WHERE tb.IDthongbao = ?`,
      [notificationId]
    );

    if (rows.length === 0) {
      return null;
    }

    const notification = rows[0];
    return {
      id: notification.id,
      userId: notification.userId,
      message: notification.message,
      type: notification.type,
      timestamp: new Date(notification.timestamp),
      isRead: true // We're marking it as read in the response
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsReadByUserId = async (userId: string): Promise<Notification[]> => {
  try {
    // Since we don't have an isRead field in thongbao, we'll just return all notifications as read
    return await getNotificationsByUserId(userId);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};
