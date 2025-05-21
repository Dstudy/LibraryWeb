
import { z } from 'zod';

export const bookSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().min(1, { message: "Type is required." }),
  name: z.string().min(1, { message: "Name is required." }),
  quantity: z.number().int().min(0, { message: "Total quantity must be a non-negative integer." }),
  author: z.string().min(1, { message: "Author is required." }),
  publisher: z.string().min(1, { message: "Publisher is required." }),
  publishYear: z.number().int().min(1000, { message: "Enter a valid 4-digit year." }).max(new Date().getFullYear() + 5, { message: "Year cannot be too far in the future."}),
  importDate: z.date({ required_error: "Import date is required." }),
  borrowedCount: z.number().int().min(0).default(0).optional(), // Number of copies currently borrowed
});

export type Book = z.infer<typeof bookSchema>;

export const lendingRecordSchema = z.object({
  id: z.number(),
  bookId: z.union([z.string(), z.number()]),
  bookName: z.string(), // For easier display
  readerId: z.string().min(1, { message: "Reader ID is required." }),
  readerName: z.string().optional(), // Added for displaying reader name
  borrowDate: z.date(),
  dueDate: z.date(),
  returnDate: z.date().nullable().optional(),
});

export type LendingRecord = z.infer<typeof lendingRecordSchema>;

// For sorting
export type SortableBookFields = keyof Omit<Book, 'id' | 'importDate' | 'borrowedCount'> | 'importDate' | 'id' | 'borrowedCount';

export type SortConfig = {
  key: SortableBookFields;
  direction: 'ascending' | 'descending';
} | null;

// User type
export interface User {
  id: string;
  name: string;
  role: 'librarian' | 'reader';
  dateOfBirth?: string;
  email?: string; // Added for backward compatibility with existing code
}

// Notification type
export type NotificationType = 'overdue' | 'new_borrow' | 'general';

export interface Notification {
  id: number;
  userId: string; // Can be either User['id'] or User['email'] depending on implementation
  message: string;
  type: NotificationType;
  timestamp: Date;
  isRead: boolean;
}
