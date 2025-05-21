import { NextResponse } from 'next/server';
import { getLendingRecordById, returnLendingRecord } from '@/app/api/lib/data-vietnamese';

// GET /api/lending/records/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    const record = await getLendingRecordById(id);
    if (!record) {
      return NextResponse.json({ message: 'Lending record not found' }, { status: 404 });
    }

    // Convert Date objects to ISO strings for JSON serialization
    const recordForApi = {
      ...record,
      borrowDate: record.borrowDate.toISOString(),
      dueDate: record.dueDate.toISOString(),
      returnDate: record.returnDate ? record.returnDate.toISOString() : null,
    };

    return NextResponse.json(recordForApi, { status: 200 });
  } catch (error) {
    console.error(`Error in GET /api/lending/records/${params.id}:`, error);
    return NextResponse.json({ message: 'Failed to fetch lending record' }, { status: 500 });
  }
}

// PUT /api/lending/records/[id]
// Used for returning a book
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    if (action !== 'return') {
      return NextResponse.json({ message: 'Invalid action. Only "return" is supported.' }, { status: 400 });
    }

    const record = await getLendingRecordById(id);
    if (!record) {
      return NextResponse.json({ message: 'Lending record not found' }, { status: 404 });
    }

    if (record.returnDate) {
      return NextResponse.json({ message: 'Book has already been returned' }, { status: 400 });
    }

    const updatedRecord = await returnLendingRecord(id);
    if (!updatedRecord) {
      return NextResponse.json({ message: 'Failed to return book' }, { status: 500 });
    }

    // Convert Date objects to ISO strings for JSON serialization
    const recordForApi = {
      ...updatedRecord,
      borrowDate: updatedRecord.borrowDate.toISOString(),
      dueDate: updatedRecord.dueDate.toISOString(),
      returnDate: updatedRecord.returnDate ? updatedRecord.returnDate.toISOString() : null,
    };

    return NextResponse.json(recordForApi, { status: 200 });
  } catch (error) {
    console.error(`Error in PUT /api/lending/records/${params.id}:`, error);
    return NextResponse.json({ message: 'Failed to update lending record' }, { status: 500 });
  }
}
