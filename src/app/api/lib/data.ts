
import type { Book, LendingRecord, Notification } from '@/lib/types';
import { addDays } from 'date-fns';

export let books: Book[] = [
  { id: 1, type: 'Fiction', name: 'The Great Gatsby', quantity: 5, author: 'F. Scott Fitzgerald', publisher: 'Scribner', publishYear: 1925, importDate: new Date('2023-01-15T00:00:00.000Z'), borrowedCount: 0 },
  { id: 2, type: 'Science Fiction', name: 'Dune', quantity: 3, author: 'Frank Herbert', publisher: 'Chilton Books', publishYear: 1965, importDate: new Date('2023-02-20T00:00:00.000Z'), borrowedCount: 1 },
  { id: 3, type: 'Non-Fiction', name: 'Sapiens: A Brief History of Humankind', quantity: 7, author: 'Yuval Noah Harari', publisher: 'Harvill Secker', publishYear: 2011, importDate: new Date('2023-03-10T00:00:00.000Z'), borrowedCount: 0 },
  { id: 4, type: 'Fantasy', name: 'Harry Potter and the Sorcerer\'s Stone', quantity: 10, author: 'J.K. Rowling', publisher: 'Bloomsbury', publishYear: 1997, importDate: new Date('2022-12-05T00:00:00.000Z'), borrowedCount: 0 },
  { id: 5, type: 'Mystery', name: 'The Da Vinci Code', quantity: 4, author: 'Dan Brown', publisher: 'Doubleday', publishYear: 2003, importDate: new Date('2023-04-25T00:00:00.000Z'), borrowedCount: 0 },
];

export let nextId = books.length > 0 ? Math.max(...books.map(b => b.id!)) + 1 : 1;

export let lendingRecords: LendingRecord[] = [
  { id: 1, bookId: 2, bookName: 'Dune', userEmail: 'reader@example.com', borrowDate: new Date('2024-05-01T00:00:00.000Z'), dueDate: addDays(new Date('2024-05-01T00:00:00.000Z'), 14), returnDate: null },
];
export let nextLendingRecordId = lendingRecords.length > 0 ? Math.max(...lendingRecords.map(lr => lr.id)) + 1 : 1;

export const LENDING_PERIOD_DAYS = 14;
export const MAX_BORROW_LIMIT = 3;

// Book Functions
export const getBooks = (): Book[] => {
  return books.map(book => ({...book, importDate: new Date(book.importDate), borrowedCount: book.borrowedCount || 0}));
};

export const addBook = (book: Omit<Book, 'id' | 'importDate' | 'borrowedCount'> & { importDate: string | Date }): Book => {
  const newBook: Book = {
    ...book,
    id: nextId++,
    importDate: new Date(book.importDate),
    borrowedCount: 0,
  };
  books.push(newBook);
  return newBook;
};

export const getBookById = (id: number): Book | undefined => {
  const book = books.find((b) => b.id === id);
  if (book) {
    return {...book, importDate: new Date(book.importDate), borrowedCount: book.borrowedCount || 0};
  }
  return undefined;
};

export const updateBook = (id: number, updatedBookData: Omit<Book, 'id' | 'importDate' | 'borrowedCount'> & { importDate: string | Date, borrowedCount?: number }): Book | null => {
  const bookIndex = books.findIndex((b) => b.id === id);
  if (bookIndex !== -1) {
    books[bookIndex] = {
      ...books[bookIndex],
      ...updatedBookData,
      importDate: new Date(updatedBookData.importDate),
      borrowedCount: updatedBookData.borrowedCount !== undefined ? updatedBookData.borrowedCount : books[bookIndex].borrowedCount,
      id: books[bookIndex].id,
    };
    return {...books[bookIndex], importDate: new Date(books[bookIndex].importDate)};
  }
  return null;
};

export const deleteBook = (id: number): boolean => {
  if (lendingRecords.some(lr => lr.bookId === id && lr.returnDate === null)) {
    return false; 
  }
  const initialLength = books.length;
  books = books.filter((b) => b.id !== id);
  return books.length < initialLength;
};

// Lending Record Functions
export const getLendingRecords = (): LendingRecord[] => {
  return lendingRecords.map(lr => ({
    ...lr,
    borrowDate: new Date(lr.borrowDate),
    dueDate: new Date(lr.dueDate!),
    returnDate: lr.returnDate ? new Date(lr.returnDate) : null,
  }));
};

export const getLendingRecordById = (id: number): LendingRecord | undefined => {
  const record = lendingRecords.find(lr => lr.id === id);
   if (record) {
    return {
      ...record,
      borrowDate: new Date(record.borrowDate),
      dueDate: new Date(record.dueDate!),
      returnDate: record.returnDate ? new Date(record.returnDate) : null,
    };
  }
  return undefined;
};

export const addLendingRecord = (recordData: Omit<LendingRecord, 'id' | 'dueDate'>): LendingRecord => {
  const borrowDate = new Date(recordData.borrowDate);
  const newRecord: LendingRecord = {
    ...recordData,
    id: nextLendingRecordId++,
    borrowDate: borrowDate,
    dueDate: addDays(borrowDate, LENDING_PERIOD_DAYS),
    returnDate: null,
  };
  lendingRecords.push(newRecord);
  return newRecord;
};

export const returnLendingRecord = (id: number): LendingRecord | null => {
  const recordIndex = lendingRecords.findIndex(lr => lr.id === id);
  if (recordIndex !== -1 && lendingRecords[recordIndex].returnDate === null) {
    lendingRecords[recordIndex].returnDate = new Date();
    
    const book = getBookById(lendingRecords[recordIndex].bookId);
    if (book && book.borrowedCount && book.borrowedCount > 0) {
      updateBook(book.id!, { ...book, borrowedCount: book.borrowedCount - 1 });
    }
    return {...lendingRecords[recordIndex]};
  }
  return null;
};

// Notification Data
export let notifications: Notification[] = [];
export let nextNotificationId = 1;

// Notification Functions
export const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Notification => {
  const newNotification: Notification = {
    ...notificationData,
    id: nextNotificationId++,
    timestamp: new Date(),
    isRead: false,
  };
  notifications.push(newNotification);
  return newNotification;
};

export const getNotificationsByUserId = (userId: string): Notification[] => {
  return notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Newest first
};

export const markNotificationAsRead = (notificationId: number): Notification | null => {
  const notificationIndex = notifications.findIndex(n => n.id === notificationId);
  if (notificationIndex !== -1) {
    notifications[notificationIndex].isRead = true;
    return { ...notifications[notificationIndex] };
  }
  return null;
};

export const markAllNotificationsAsReadByUserId = (userId: string): Notification[] => {
  notifications.forEach(n => {
    if (n.userId === userId && !n.isRead) {
      n.isRead = true;
    }
  });
  return notifications.filter(n => n.userId === userId);
};
