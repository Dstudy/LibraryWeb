import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export interface Librarian {
  id: string;
  name: string;
  dateOfBirth: string;
  phone: string;
  address: string;
}

// GET /api/librarians - Get all librarians
export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM thuthu');

    const librarians = rows.map(row => ({
      id: row.ID,
      name: row.Ten,
      dateOfBirth: row.NgaySinh ? new Date(row.NgaySinh).toISOString().split('T')[0] : null,
      phone: row.SDT,
      address: row.DiaChi
    }));

    return NextResponse.json(librarians);
  } catch (error) {
    console.error('Error fetching librarians:', error);
    return NextResponse.json({ error: 'Failed to fetch librarians' }, { status: 500 });
  }
}

// GET /api/librarians?id=123 - Get librarian by ID
export async function getLibrarianById(id: string): Promise<Librarian | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM thuthu WHERE ID = ?',
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
      console.log(`Librarian ${row.ID} - Original DB date: ${row.NgaySinh}, Formatted date: ${dateOfBirth}`);
    }

    return {
      id: row.ID,
      name: row.Ten,
      dateOfBirth: dateOfBirth,
      phone: row.SDT,
      address: row.DiaChi
    };
  } catch (error) {
    console.error('Error fetching librarian by ID:', error);
    return null;
  }
}
