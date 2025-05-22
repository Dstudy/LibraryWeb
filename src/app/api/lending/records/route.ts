import { NextResponse } from 'next/server';
import {
  getLendingRecords,
  addLendingRecord,
  getBookById,
  updateBook,
  LENDING_PERIOD_DAYS,
  MAX_BORROW_LIMIT
} from '@/app/api/lib/data-vietnamese';
import type { LendingRecord } from '@/lib/types';

// GET /api/lending/records
// Optional query param: readerId - to filter records for a specific reader
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const readerId = searchParams.get('readerId');

    // The MySQL version of getLendingRecords handles reader ID filtering
    const records = await getLendingRecords(readerId || undefined);

    // Log records for debugging
    console.log("Records from database:", records);

    // Convert Date objects to ISO strings for JSON serialization
    const recordsForApi = records.map(record => {
      // Log each record's dates for debugging
      console.log(`Record ${record.id} dates:`, {
        borrowDate: record.borrowDate,
        borrowDateType: typeof record.borrowDate,
        dueDate: record.dueDate,
        dueDateType: typeof record.dueDate,
        returnDate: record.returnDate,
        returnDateType: typeof record.returnDate
      });

      return {
        ...record,
        borrowDate: record.borrowDate.toISOString(),
        dueDate: record.dueDate.toISOString(),
        returnDate: record.returnDate ? record.returnDate.toISOString() : null,
      };
    });

    return NextResponse.json(recordsForApi, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/lending/records:", error);
    return NextResponse.json({ message: 'Failed to fetch lending records' }, { status: 500 });
  }
}

// POST /api/lending/records
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("API received request body:", body);
    const { bookId, userID } = body;

    // Enhanced validation for bookId and userID
    if (bookId === undefined || bookId === null || userID === undefined || userID === null || userID === '') {
      return NextResponse.json({
        message: 'Missing required fields: bookId and userID are required'
      }, { status: 400 });
    }

    console.log("API received bookId:", bookId, "Type:", typeof bookId);

    // Handle different types of book IDs
    let bookIdForQuery: string;

    if (typeof bookId === 'string') {
      // If it's already a string, use it directly
      bookIdForQuery = bookId;
    } else if (typeof bookId === 'number') {
      // If it's a number, convert it to string
      bookIdForQuery = String(bookId);
    } else {
      // If it's something else, try to convert it to string
      try {
        bookIdForQuery = String(bookId);
      } catch (error) {
        console.error("Error converting bookId to string:", error);
        return NextResponse.json({
          message: 'Invalid bookId format'
        }, { status: 400 });
      }
    }

    console.log("Using bookId for query:", bookIdForQuery);

    // Use userID as readerId
    const readerId = userID;

    // Check if book exists
    const book = await getBookById(bookIdForQuery);
    if (!book) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 });
    }

    // Check if book is available
    const availableCopies = (book.quantity || 0) - (book.borrowedCount || 0);
    if (availableCopies <= 0) {
      return NextResponse.json({ message: 'No copies of this book are available for borrowing' }, { status: 400 });
    }

    // Check if reader has reached borrowing limit
    const readerRecords = await getLendingRecords(readerId);
    const activeReaderRecords = readerRecords.filter(record => record.returnDate === null);

    if (activeReaderRecords.length >= MAX_BORROW_LIMIT) {
      return NextResponse.json({
        message: `Bạn đọc đã mượn tối đa ${MAX_BORROW_LIMIT} cuốn sách. Vui lòng trả sách trước khi mượn thêm.`,
        errorCode: 'BORROW_LIMIT_REACHED'
      }, { status: 400 });
    }

    // Create lending record
    const newRecord = await addLendingRecord({
      bookId: bookIdForQuery,
      bookName: book.name,
      readerId: readerId,
      borrowDate: new Date(),
    });

    // Note: The MySQL version of addLendingRecord already updates the book's borrowed count

    // Format dates for API response
    const recordForApi = {
      ...newRecord,
      borrowDate: newRecord.borrowDate.toISOString(),
      dueDate: newRecord.dueDate.toISOString(),
      returnDate: null,
    };

    return NextResponse.json(recordForApi, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/lending/records:", error);
    return NextResponse.json({ message: 'Failed to create lending record' }, { status: 500 });
  }
}