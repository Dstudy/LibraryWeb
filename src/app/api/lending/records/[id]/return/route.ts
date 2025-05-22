
import { NextResponse } from 'next/server';
import {
  returnLendingRecord,
  getLendingRecordById
} from '@/app/api/lib/data-vietnamese';

interface Params {
  params: {
    id: string;
  };
}

export async function PUT(request: Request, { params }: Params) { // Return a book
  try {
    const recordId = parseInt(params.id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ message: 'Invalid lending record ID format' }, { status: 400 });
    }

    const existingRecord = await getLendingRecordById(recordId);
    if (!existingRecord) {
      return NextResponse.json({ message: 'Lending record not found' }, { status: 404 });
    }
    if (existingRecord.returnDate !== null) {
      return NextResponse.json({ message: 'Book already returned for this record' }, { status: 400 });
    }

    const returnedRecord = await returnLendingRecord(recordId);

    if (!returnedRecord) {
      // This case implies an issue within returnLendingRecord, or record already returned (checked above)
      return NextResponse.json({ message: 'Failed to mark book as returned, or book already returned.' }, { status: 500 });
    }

    const returnedRecordForApi = {
        ...returnedRecord,
        borrowDate: returnedRecord.borrowDate.toISOString(),
        dueDate: returnedRecord.dueDate.toISOString(),
        returnDate: returnedRecord.returnDate ? returnedRecord.returnDate.toISOString() : null,
    };

    return NextResponse.json(returnedRecordForApi, { status: 200 });

  } catch (error) {
    console.error(`Error in PUT /api/lending/records/${params.id}/return:`, error);
    return NextResponse.json({ message: 'Failed to process return request' }, { status: 500 });
  }
}
