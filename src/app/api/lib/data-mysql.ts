import type { Book, LendingRecord, Notification } from '@/lib/types';
import { addDays, format } from 'date-fns';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const LENDING_PERIOD_DAYS = 14;
export const MAX_BORROW_LIMIT = 3;

// Book Functions
export const getBooks = async (): Promise<Book[]> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM books');
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      quantity: row.quantity,
      author: row.author,
      publisher: row.publisher,
      publishYear: row.publishYear,
      importDate: new Date(row.importDate),
      borrowedCount: row.borrowedCount || 0
    }));
  } catch (error) {
    console.error('Error getting books:', error);
    throw error;
  }
};

export const addBook = async (book: Omit<Book, 'id' | 'importDate' | 'borrowedCount'> & { importDate: string | Date }): Promise<Book> => {
  try {
    const importDate = new Date(book.importDate);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO books (type, name, quantity, author, publisher, publishYear, importDate, borrowedCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [book.type, book.name, book.quantity, book.author, book.publisher, book.publishYear, importDate, 0]
    );

    return {
      ...book,
      id: result.insertId,
      importDate,
      borrowedCount: 0
    };
  } catch (error) {
    console.error('Error adding book:', error);
    throw error;
  }
};

export const getBookById = async (id: number): Promise<Book | undefined> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM books WHERE id = ?', [id]);

    if (rows.length === 0) {
      return undefined;
    }

    const row = rows[0];
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      quantity: row.quantity,
      author: row.author,
      publisher: row.publisher,
      publishYear: row.publishYear,
      importDate: new Date(row.importDate),
      borrowedCount: row.borrowedCount || 0
    };
  } catch (error) {
    console.error('Error getting book by ID:', error);
    throw error;
  }
};

export const updateBook = async (id: number, updatedBookData: Omit<Book, 'id' | 'importDate' | 'borrowedCount'> & { importDate: string | Date, borrowedCount?: number }): Promise<Book | null> => {
  try {
    // First check if the book exists
    const book = await getBookById(id);
    if (!book) {
      return null;
    }

    const importDate = new Date(updatedBookData.importDate);
    const borrowedCount = updatedBookData.borrowedCount !== undefined ? updatedBookData.borrowedCount : book.borrowedCount;

    await pool.query(
      'UPDATE books SET type = ?, name = ?, quantity = ?, author = ?, publisher = ?, publishYear = ?, importDate = ?, borrowedCount = ? WHERE id = ?',
      [updatedBookData.type, updatedBookData.name, updatedBookData.quantity, updatedBookData.author, updatedBookData.publisher, updatedBookData.publishYear, importDate, borrowedCount, id]
    );

    return {
      ...updatedBookData,
      id,
      importDate,
      borrowedCount
    };
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
};

export const deleteBook = async (id: number): Promise<boolean> => {
  try {
    // Check if the book is currently borrowed
    const [activeLoans] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM lending_records WHERE bookId = ? AND returnDate IS NULL',
      [id]
    );

    if (activeLoans[0].count > 0) {
      return false; // Book is currently borrowed
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM books WHERE id = ?', [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
};

// Lending Record Functions
export const getLendingRecords = async (userEmail?: string): Promise<LendingRecord[]> => {
  try {
    let query = 'SELECT * FROM lending_records';
    let params: any[] = [];

    if (userEmail) {
      query += ' WHERE userEmail = ?';
      params.push(userEmail);
    }

    query += ' ORDER BY borrowDate DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map(row => ({
      id: row.id,
      bookId: row.bookId,
      bookName: row.bookName,
      userEmail: row.userEmail,
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
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM lending_records WHERE id = ?', [id]);

    if (rows.length === 0) {
      return undefined;
    }

    const row = rows[0];
    return {
      id: row.id,
      bookId: row.bookId,
      bookName: row.bookName,
      userEmail: row.userEmail,
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
    const borrowDate = new Date(recordData.borrowDate);
    const dueDate = addDays(borrowDate, LENDING_PERIOD_DAYS);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO lending_records (bookId, bookName, userEmail, borrowDate, dueDate, returnDate) VALUES (?, ?, ?, ?, ?, ?)',
      [recordData.bookId, recordData.bookName, recordData.userEmail, borrowDate, dueDate, null]
    );

    // Update the book's borrowed count
    await pool.query(
      'UPDATE books SET borrowedCount = borrowedCount + 1 WHERE id = ?',
      [recordData.bookId]
    );

    return {
      ...recordData,
      id: result.insertId,
      borrowDate,
      dueDate,
      returnDate: null
    };
  } catch (error) {
    console.error('Error adding lending record:', error);
    throw error;
  }
};

export const returnLendingRecord = async (id: number): Promise<LendingRecord | null> => {
  try {
    // Get the record first
    const record = await getLendingRecordById(id);
    if (!record || record.returnDate !== null) {
      return null;
    }

    const returnDate = new Date();

    // Update the record
    await pool.query(
      'UPDATE lending_records SET returnDate = ? WHERE id = ?',
      [returnDate, id]
    );

    // Update the book's borrowed count
    await pool.query(
      'UPDATE books SET borrowedCount = borrowedCount - 1 WHERE id = ? AND borrowedCount > 0',
      [record.bookId]
    );

    return {
      ...record,
      returnDate
    };
  } catch (error) {
    console.error('Error returning lending record:', error);
    throw error;
  }
};

// Notification Functions
export const addNotification = async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification> => {
  try {
    const timestamp = new Date();

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO notifications (userId, message, type, timestamp, isRead) VALUES (?, ?, ?, ?, ?)',
      [notificationData.userId, notificationData.message, notificationData.type, timestamp, false]
    );

    return {
      ...notificationData,
      id: result.insertId,
      timestamp,
      isRead: false
    };
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
};

export const getNotificationsByUserId = async (userId: string): Promise<Notification[]> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC',
      [userId]
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
    // Check if notification exists
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM notifications WHERE id = ?', [notificationId]);

    if (rows.length === 0) {
      return null;
    }

    await pool.query('UPDATE notifications SET isRead = TRUE WHERE id = ?', [notificationId]);

    const notification = rows[0];
    return {
      id: notification.id,
      userId: notification.userId,
      message: notification.message,
      type: notification.type,
      timestamp: new Date(notification.timestamp),
      isRead: true
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsReadByUserId = async (userId: string): Promise<Notification[]> => {
  try {
    await pool.query('UPDATE notifications SET isRead = TRUE WHERE userId = ? AND isRead = FALSE', [userId]);
    return await getNotificationsByUserId(userId);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};
