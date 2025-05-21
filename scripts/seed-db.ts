import pool, { initDatabase } from '../src/lib/db';
import { addDays } from 'date-fns';

async function seedDatabase() {
  try {
    // First initialize the database
    await initDatabase();
    
    // Check if books table is empty
    const [bookRows] = await pool.query('SELECT COUNT(*) as count FROM books');
    const bookCount = (bookRows as any)[0].count;
    
    if (bookCount === 0) {
      console.log('Seeding books...');
      
      // Sample books
      const books = [
        { type: 'Fiction', name: 'The Great Gatsby', quantity: 5, author: 'F. Scott Fitzgerald', publisher: 'Scribner', publishYear: 1925, importDate: new Date('2023-01-15T00:00:00.000Z'), borrowedCount: 0 },
        { type: 'Science Fiction', name: 'Dune', quantity: 3, author: 'Frank Herbert', publisher: 'Chilton Books', publishYear: 1965, importDate: new Date('2023-02-20T00:00:00.000Z'), borrowedCount: 1 },
        { type: 'Non-Fiction', name: 'Sapiens: A Brief History of Humankind', quantity: 7, author: 'Yuval Noah Harari', publisher: 'Harvill Secker', publishYear: 2011, importDate: new Date('2023-03-10T00:00:00.000Z'), borrowedCount: 0 },
        { type: 'Fantasy', name: 'Harry Potter and the Sorcerer\'s Stone', quantity: 10, author: 'J.K. Rowling', publisher: 'Bloomsbury', publishYear: 1997, importDate: new Date('2022-12-05T00:00:00.000Z'), borrowedCount: 0 },
        { type: 'Mystery', name: 'The Da Vinci Code', quantity: 4, author: 'Dan Brown', publisher: 'Doubleday', publishYear: 2003, importDate: new Date('2023-04-25T00:00:00.000Z'), borrowedCount: 0 },
      ];
      
      for (const book of books) {
        await pool.query(
          'INSERT INTO books (type, name, quantity, author, publisher, publishYear, importDate, borrowedCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [book.type, book.name, book.quantity, book.author, book.publisher, book.publishYear, book.importDate, book.borrowedCount]
        );
      }
      
      console.log('Books seeded successfully');
    } else {
      console.log(`Books table already has ${bookCount} records, skipping seed`);
    }
    
    // Check if lending_records table is empty
    const [lendingRows] = await pool.query('SELECT COUNT(*) as count FROM lending_records');
    const lendingCount = (lendingRows as any)[0].count;
    
    if (lendingCount === 0) {
      console.log('Seeding lending records...');
      
      // Get the ID of the Dune book
      const [duneBook] = await pool.query('SELECT id FROM books WHERE name = ?', ['Dune']);
      
      if ((duneBook as any).length > 0) {
        const duneId = (duneBook as any)[0].id;
        const borrowDate = new Date('2024-05-01T00:00:00.000Z');
        const dueDate = addDays(borrowDate, 14);
        
        await pool.query(
          'INSERT INTO lending_records (bookId, bookName, userEmail, borrowDate, dueDate, returnDate) VALUES (?, ?, ?, ?, ?, ?)',
          [duneId, 'Dune', 'reader@example.com', borrowDate, dueDate, null]
        );
        
        console.log('Lending records seeded successfully');
      } else {
        console.log('Could not find Dune book, skipping lending record seed');
      }
    } else {
      console.log(`Lending records table already has ${lendingCount} records, skipping seed`);
    }
    
    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
