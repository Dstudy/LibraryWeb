
import { NextResponse } from 'next/server';
import { getBookById, updateBook, deleteBook } from '@/app/api/lib/data-vietnamese';
import { bookSchema } from '@/lib/types';
import type { Book } from '@/lib/types';

interface Params {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const id = params.id;
    const book = await getBookById(id);
    if (!book) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 });
    }
    // Convert Date object to ISO string for JSON serialization
    const bookForApi = {
      ...book,
      importDate: book.importDate.toISOString(),
    };
    return NextResponse.json(bookForApi, { status: 200 });
  } catch (error) {
    console.error(`Error in GET /api/books/${params.id}:`, error);
    return NextResponse.json({ message: 'Failed to fetch book' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const id = params.id;
    const body = await request.json();

    // Validate incoming data, explicitly convert importDate if it's a string
     const parseData = {
      ...body,
      importDate: body.importDate ? new Date(body.importDate) : new Date(), // Ensure Date object
    };

    const validation = bookSchema.omit({id: true}).safeParse(parseData);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid book data', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    // updateBook in data-vietnamese.ts now handles ensuring importDate is a Date object.
    // We pass the validated data.
    const updatedBook = await updateBook(id, validation.data as Omit<Book, 'id'>);

    if (!updatedBook) {
      return NextResponse.json({ message: 'Book not found' }, { status: 404 });
    }

    // Convert Date object to ISO string for JSON serialization
    const updatedBookForApi = {
      ...updatedBook,
      importDate: updatedBook.importDate.toISOString(),
    };
    return NextResponse.json(updatedBookForApi, { status: 200 });

  } catch (error) {
    console.error(`Error in PUT /api/books/${params.id}:`, error);
     if (error instanceof Error && error.message.includes("Validation error")) {
        return NextResponse.json({ message: 'Invalid book data provided.', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const id = params.id;
    const success = await deleteBook(id);
    if (!success) {
      return NextResponse.json({ message: 'Book not found or could not be deleted' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Book deleted successfully' }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error(`Error in DELETE /api/books/${params.id}:`, error);
    return NextResponse.json({ message: 'Failed to delete book' }, { status: 500 });
  }
}
