import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'Library',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
export async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    // Create theloaisach (Book Categories) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS theloaisach (
        ID VARCHAR(25) PRIMARY KEY,
        Name VARCHAR(255) NOT NULL,
        Sum INT NOT NULL DEFAULT 0,
        MoTa VARCHAR(255),
        ChoMuon TINYINT NOT NULL DEFAULT 1
      )
    `);

    // Create sach (Books) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sach (
        ID VARCHAR(25) PRIMARY KEY,
        NhaXuatBan VARCHAR(255) NOT NULL,
        TacGia VARCHAR(255) NOT NULL,
        Nam INT NOT NULL,
        TieuDe VARCHAR(255) NOT NULL,
        IDTheLoaiSach VARCHAR(25) NOT NULL,
        NguonGoc VARCHAR(255),
        FOREIGN KEY (IDTheLoaiSach) REFERENCES theloaisach(ID)
      )
    `);

    // Create thuthu (Librarians) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS thuthu (
        ID VARCHAR(25) PRIMARY KEY,
        Ten VARCHAR(255) NOT NULL,
        NgaySinh DATE,
        SDT VARCHAR(25),
        DiaChi VARCHAR(255)
      )
    `);

    // Create bandoc (Readers) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bandoc (
        ID VARCHAR(25) PRIMARY KEY,
        Ten VARCHAR(255) NOT NULL,
        SDT VARCHAR(25),
        DiaChi VARCHAR(255),
        NgaySinh DATE,
        GioiTinh VARCHAR(10)
      )
    `);

    // Create luotmuon (Borrowing Records) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS luotmuon (
        ID INT PRIMARY KEY AUTO_INCREMENT,
        IDBanDoc VARCHAR(25),
        IDThuThu VARCHAR(25),
        NgayMuon DATE NOT NULL,
        NgayCanTra DATE NOT NULL,
        NgayTra DATE,
        TrangThai VARCHAR(50) DEFAULT 'Đang mượn',
        FOREIGN KEY (IDBanDoc) REFERENCES bandoc(ID),
        FOREIGN KEY (IDThuThu) REFERENCES thuthu(ID)
      )
    `);

    // Create sachmuon (Borrowed Books) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sachmuon (
        IDSach VARCHAR(25) NOT NULL,
        IDLuotMuon INT NOT NULL,
        PRIMARY KEY (IDSach, IDLuotMuon),
        FOREIGN KEY (IDSach) REFERENCES sach(ID),
        FOREIGN KEY (IDLuotMuon) REFERENCES luotmuon(ID)
      )
    `);

    // Create thongke (Statistics) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS thongke (
        IDSach VARCHAR(25) NOT NULL,
        LuotMuon INT DEFAULT 0,
        PRIMARY KEY (IDSach),
        FOREIGN KEY (IDSach) REFERENCES sach(ID)
      )
    `);

    // Create taikhoan (Accounts) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS taikhoan (
        TenTK VARCHAR(255) PRIMARY KEY,
        MatKhau VARCHAR(255) NOT NULL,
        IDBanDoc VARCHAR(25),
        FOREIGN KEY (IDBanDoc) REFERENCES bandoc(ID)
      )
    `);

    // Create thongbao (Notifications) table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS thongbao (
        IDthongbao INT PRIMARY KEY AUTO_INCREMENT,
        IDBanDoc VARCHAR(25),
        IDLuotMuon INT,
        NoiDung TEXT,
        NgayThongBao DATETIME NOT NULL,
        FOREIGN KEY (IDBanDoc) REFERENCES bandoc(ID),
        FOREIGN KEY (IDLuotMuon) REFERENCES luotmuon(ID)
      )
    `);

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export the pool to be used in other files
export default pool;
