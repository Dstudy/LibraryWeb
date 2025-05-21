
import { NextResponse } from 'next/server';
import { getBooks, addBook } from '@/app/api/lib/data-vietnamese';
import { bookSchema } from '@/lib/types';
import type { Book } from '@/lib/types';

export async function GET() {
  try {
    const books = await getBooks();
    // Convert Date objects to ISO strings for JSON serialization
    const booksForApi = books.map(book => {
      let importDateStr: string;
      if (book.importDate instanceof Date && !isNaN(book.importDate.getTime())) {
        importDateStr = book.importDate.toISOString();
      } else if (typeof book.importDate === 'string') {
        const parsedDate = new Date(book.importDate);
        if (!isNaN(parsedDate.getTime())) {
          importDateStr = parsedDate.toISOString();
        } else {
          console.warn(`Book ID ${book.id} had an invalid string importDate: ${book.importDate}. Defaulting to epoch.`);
          importDateStr = new Date(0).toISOString(); // Default to epoch or handle as error
        }
      } else {
        console.warn(`Book ID ${book.id} has an invalid or missing importDate: ${book.importDate}. Defaulting to epoch.`);
        importDateStr = new Date(0).toISOString(); // Default to epoch or handle as error
      }
      return {
        ...book,
        importDate: importDateStr,
      };
    });
    return NextResponse.json(booksForApi, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/books:", error);
    return NextResponse.json({ message: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate incoming data, explicitly convert importDate if it's a string
    const parseData = {
      ...body,
      importDate: body.importDate ? new Date(body.importDate) : new Date(),
    };

    const validation = bookSchema.omit({id: true}).safeParse(parseData);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid book data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    // The addBook function in data-mysql.ts now handles ensuring importDate is a Date object.
    // We pass the validated data.
    const newBook = await addBook(validation.data as Omit<Book, 'id'>);

    // Convert Date object to ISO string for JSON serialization
    const newBookForApi = {
      ...newBook,
      importDate: newBook.importDate.toISOString(),
    };
    return NextResponse.json(newBookForApi, { status: 201 });

  } catch (error) {
    console.error("Error in POST /api/books:", error);
    // Check if it's a ZodError for more specific messaging if needed, but generally keep it simple
    if (error instanceof Error && error.message.includes("Validation error")) {
        return NextResponse.json({ message: 'Invalid book data provided.', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to add book' }, { status: 500 });
  }
}
