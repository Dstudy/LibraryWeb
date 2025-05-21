import pool, { initDatabase } from '../src/lib/db';
import { addDays } from 'date-fns';

async function seedVietnameseDatabase() {
  try {
    // First initialize the database
    await initDatabase();

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if theloaisach table is empty
      const [categoryRows] = await connection.query('SELECT COUNT(*) as count FROM theloaisach');
      const categoryCount = (categoryRows as any)[0].count;

      if (categoryCount === 0) {
        console.log('Seeding book categories...');

        // Sample book categories
        const categories = [
          { id: 'TL001', name: 'Tiểu thuyết', sum: 0 },
          { id: 'TL002', name: 'Khoa học', sum: 0 },
          { id: 'TL003', name: 'Lịch sử', sum: 0 },
          { id: 'TL004', name: 'Văn học', sum: 0 },
          { id: 'TL005', name: 'Thiếu nhi', sum: 0 },
        ];

        for (const category of categories) {
          await connection.query(
            'INSERT INTO theloaisach (ID, Name, Sum) VALUES (?, ?, ?)',
            [category.id, category.name, category.sum]
          );
        }

        console.log('Book categories seeded successfully');
      } else {
        console.log(`theloaisach table already has ${categoryCount} records, skipping seed`);
      }

      // Check if thuthu table is empty
      const [librarianRows] = await connection.query('SELECT COUNT(*) as count FROM thuthu');
      const librarianCount = (librarianRows as any)[0].count;

      if (librarianCount === 0) {
        console.log('Seeding librarians...');

        // Sample librarians
        const librarians = [
          { id: 'TT001', name: 'Nguyễn Văn A', birthDate: '1985-05-15', phone: '0901234567', address: 'Hà Nội' },
          { id: 'TT002', name: 'Trần Thị B', birthDate: '1990-10-20', phone: '0912345678', address: 'Hồ Chí Minh' },
        ];

        for (const librarian of librarians) {
          await connection.query(
            'INSERT INTO thuthu (ID, Ten, NgaySinh, SDT, DiaChi) VALUES (?, ?, ?, ?, ?)',
            [librarian.id, librarian.name, librarian.birthDate, librarian.phone, librarian.address]
          );
        }

        console.log('Librarians seeded successfully');
      } else {
        console.log(`thuthu table already has ${librarianCount} records, skipping seed`);
      }

      // Check if bandoc table is empty
      const [readerRows] = await connection.query('SELECT COUNT(*) as count FROM bandoc');
      const readerCount = (readerRows as any)[0].count;

      if (readerCount === 0) {
        console.log('Seeding readers...');

        // Sample readers
        const readers = [
          { id: 'BD001', name: 'Lê Văn C', birthDate: '1995-03-10', phone: '0923456789', address: 'Đà Nẵng', gender: 'Nam' },
          { id: 'BD002', name: 'Phạm Thị D', birthDate: '1998-07-25', phone: '0934567890', address: 'Hải Phòng', gender: 'Nữ' },
          { id: 'BD003', name: 'reader@example.com', birthDate: '2000-01-01', phone: '0945678901', address: 'Cần Thơ', gender: 'Nam' },
        ];

        for (const reader of readers) {
          await connection.query(
            'INSERT INTO bandoc (ID, Ten, NgaySinh, SDT, DiaChi, GioiTinh) VALUES (?, ?, ?, ?, ?, ?)',
            [reader.id, reader.name, reader.birthDate, reader.phone, reader.address, reader.gender]
          );
        }

        console.log('Readers seeded successfully');
      } else {
        console.log(`bandoc table already has ${readerCount} records, skipping seed`);
      }

      // Check if sach table is empty
      const [bookRows] = await connection.query('SELECT COUNT(*) as count FROM sach');
      const bookCount = (bookRows as any)[0].count;

      if (bookCount === 0) {
        console.log('Seeding books...');

        // Sample books
        const books = [
          { id: 'S001', title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', publisher: 'NXB Kim Đồng', year: 1941, categoryId: 'TL005' },
          { id: 'S002', title: 'Số Đỏ', author: 'Vũ Trọng Phụng', publisher: 'NXB Văn Học', year: 1936, categoryId: 'TL004' },
          { id: 'S003', title: 'Lịch Sử Việt Nam', author: 'Nhiều tác giả', publisher: 'NXB Giáo Dục', year: 2010, categoryId: 'TL003' },
          { id: 'S004', title: 'Vũ Trụ Trong Một Vỏ Hạt', author: 'Stephen Hawking', publisher: 'NXB Trẻ', year: 2017, categoryId: 'TL002' },
          { id: 'S005', title: 'Nhà Giả Kim', author: 'Paulo Coelho', publisher: 'NXB Văn Học', year: 2013, categoryId: 'TL001' },
        ];

        for (const book of books) {
          await connection.query(
            'INSERT INTO sach (ID, TieuDe, TacGia, NhaXuatBan, Nam, IDTheLoaiSach) VALUES (?, ?, ?, ?, ?, ?)',
            [book.id, book.title, book.author, book.publisher, book.year, book.categoryId]
          );

          // Update category count
          await connection.query(
            'UPDATE theloaisach SET Sum = Sum + 1 WHERE ID = ?',
            [book.categoryId]
          );

          // Initialize thongke
          await connection.query(
            'INSERT INTO thongke (IDSach, LuotMuon) VALUES (?, ?)',
            [book.id, 0]
          );
        }

        console.log('Books seeded successfully');
      } else {
        console.log(`sach table already has ${bookCount} records, skipping seed`);
      }

      // Check if taikhoan table is empty
      const [accountRows] = await connection.query('SELECT COUNT(*) as count FROM taikhoan');
      const accountCount = (accountRows as any)[0].count;

      if (accountCount === 0) {
        console.log('Seeding accounts...');

        // Sample accounts
        const accounts = [
          { username: 'reader', password: '1', readerId: 'BD003' },
          { username: 'admin', password: '1', readerId: null },
        ];

        for (const account of accounts) {
          await connection.query(
            'INSERT INTO taikhoan (TenTK, MatKhau, IDBanDoc) VALUES (?, ?, ?)',
            [account.username, account.password, account.readerId]
          );
        }

        console.log('Accounts seeded successfully');
      } else {
        console.log(`taikhoan table already has ${accountCount} records, skipping seed`);
      }

      // Create a sample loan
      const [loanRows] = await connection.query('SELECT COUNT(*) as count FROM luotmuon');
      const loanCount = (loanRows as any)[0].count;

      if (loanCount === 0) {
        console.log('Creating a sample loan...');

        const borrowDate = new Date();
        const dueDate = addDays(borrowDate, 14);

        // Create loan
        const [loanResult] = await connection.query(
          'INSERT INTO luotmuon (ID, IDBanDoc, IDThuThu, NgayMuon, NgayCanTra, TrangThai) VALUES (?, ?, ?, ?, ?, ?)',
          [1, 'BD003', 'TT001', borrowDate, dueDate, 'Đang mượn']
        );

        // Create book-loan relationship
        await connection.query(
          'INSERT INTO sachmuon (IDSach, IDLuotMuon) VALUES (?, ?)',
          ['S002', 1]
        );

        // Update book borrow count
        await connection.query(
          'UPDATE thongke SET LuotMuon = LuotMuon + 1 WHERE IDSach = ?',
          ['S002']
        );

        console.log('Sample loan created successfully');
      } else {
        console.log(`luotmuon table already has ${loanCount} records, skipping sample loan`);
      }

      // Create a sample notification
      const [notificationRows] = await connection.query('SELECT COUNT(*) as count FROM thongbao');
      const notificationCount = (notificationRows as any)[0].count;

      if (notificationCount === 0) {
        console.log('Creating a sample notification...');

        await connection.query(
          'INSERT INTO thongbao (IDBanDoc, IDLuotMuon, NoiDung, NgayThongBao) VALUES (?, ?, ?, ?)',
          ['BD003', 1, 'Chào mừng bạn đến với thư viện!', new Date()]
        );

        console.log('Sample notification created successfully');
      } else {
        console.log(`thongbao table already has ${notificationCount} records, skipping sample notification`);
      }

      await connection.commit();
      console.log('Database seeding completed successfully');
    } catch (error) {
      await connection.rollback();
      console.error('Error seeding database:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in seedVietnameseDatabase:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the seed function
seedVietnameseDatabase()
  .then(() => {
    console.log('Vietnamese database seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Vietnamese database seed script failed:', error);
    process.exit(1);
  });
