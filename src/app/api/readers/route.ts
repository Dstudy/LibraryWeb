import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Reader {
  id: string;
  name: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
}

// GET /api/readers - Get all readers
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      const reader = await getReaderById(id);
      if (!reader) {
        return NextResponse.json({ error: 'Reader not found' }, { status: 404 });
      }
      return NextResponse.json(reader);
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM bandoc');

    const readers = rows.map(row => ({
      id: row.ID,
      name: row.Ten,
      phone: row.SDT,
      address: row.DiaChi,
      dateOfBirth: row.NgaySinh ? new Date(row.NgaySinh).toISOString().split('T')[0] : null,
      gender: row.GioiTinh
    }));

    return NextResponse.json(readers);
  } catch (error) {
    console.error('Error fetching readers:', error);
    return NextResponse.json({ error: 'Failed to fetch readers' }, { status: 500 });
  }
}

// POST /api/readers - Create a new reader
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, address, dateOfBirth, gender } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Reader name is required' },
        { status: 400 }
      );
    }

    // Generate a new reader ID with prefix 'BD'
    const readerIdPrefix = 'BD';
    const [maxIdResult] = await pool.query<RowDataPacket[]>(
      'SELECT MAX(ID) as maxId FROM bandoc WHERE ID LIKE ?',
      [`${readerIdPrefix}%`]
    );

    const maxId = maxIdResult[0].maxId || `${readerIdPrefix}000`;
    const numericPart = parseInt(maxId.substring(readerIdPrefix.length)) + 1;
    const newId = `${readerIdPrefix}${numericPart.toString().padStart(3, '0')}`;

    // Format date for MySQL
    let formattedDate = null;
    if (dateOfBirth) {
      formattedDate = new Date(dateOfBirth).toISOString().split('T')[0];
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO bandoc (ID, Ten, SDT, DiaChi, NgaySinh, GioiTinh) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, name, phone || null, address || null, formattedDate, gender || null]
    );

    if (result.affectedRows === 1) {
      const newReader = {
        id: newId,
        name,
        phone: phone || null,
        address: address || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null
      };

      return NextResponse.json(newReader, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Failed to create reader' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating reader:', error);
    return NextResponse.json(
      { error: 'Failed to create reader' },
      { status: 500 }
    );
  }
}

// PUT /api/readers - Update a reader
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, address, dateOfBirth, gender } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Reader ID and name are required' },
        { status: 400 }
      );
    }

    // Check if reader exists
    const [existingReaders] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM bandoc WHERE ID = ?',
      [id]
    );

    if (existingReaders.length === 0) {
      return NextResponse.json(
        { error: 'Reader not found' },
        { status: 404 }
      );
    }

    // Format date for MySQL
    let formattedDate = null;
    if (dateOfBirth) {
      formattedDate = new Date(dateOfBirth).toISOString().split('T')[0];
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE bandoc SET Ten = ?, SDT = ?, DiaChi = ?, NgaySinh = ?, GioiTinh = ? WHERE ID = ?',
      [name, phone || null, address || null, formattedDate, gender || null, id]
    );

    if (result.affectedRows === 1) {
      const updatedReader = {
        id,
        name,
        phone: phone || null,
        address: address || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null
      };

      return NextResponse.json(updatedReader);
    } else {
      return NextResponse.json(
        { error: 'Failed to update reader' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating reader:', error);
    return NextResponse.json(
      { error: 'Failed to update reader' },
      { status: 500 }
    );
  }
}

// DELETE /api/readers - Delete a reader
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Reader ID is required' },
        { status: 400 }
      );
    }

    // Check if reader exists
    const [existingReaders] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM bandoc WHERE ID = ?',
      [id]
    );

    if (existingReaders.length === 0) {
      return NextResponse.json(
        { error: 'Reader not found' },
        { status: 404 }
      );
    }

    // Check if reader has any active borrowing records
    const [activeBorrowings] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM luotmuon WHERE IDBanDoc = ? AND NgayTra IS NULL',
      [id]
    );

    if (activeBorrowings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete reader with active borrowings' },
        { status: 409 }
      );
    }

    // Delete reader
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM bandoc WHERE ID = ?',
      [id]
    );

    if (result.affectedRows === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete reader' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting reader:', error);
    return NextResponse.json(
      { error: 'Failed to delete reader' },
      { status: 500 }
    );
  }
}

// Helper function to get reader by ID
export async function getReaderById(id: string): Promise<Reader | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM bandoc WHERE ID = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    // Ensure proper date handling
    let dateOfBirth = null;
    if (row.NgaySinh) {
      // Create a date object with the time part set to noon to avoid timezone issues
      const date = new Date(row.NgaySinh);
      date.setHours(12, 0, 0, 0);
      dateOfBirth = date.toISOString().split('T')[0];
      console.log(`Reader ${row.ID} - Original DB date: ${row.NgaySinh}, Formatted date: ${dateOfBirth}`);
    }

    return {
      id: row.ID,
      name: row.Ten,
      phone: row.SDT,
      address: row.DiaChi,
      dateOfBirth: dateOfBirth,
      gender: row.GioiTinh
    };
  } catch (error) {
    console.error('Error fetching reader by ID:', error);
    return null;
  }
}
