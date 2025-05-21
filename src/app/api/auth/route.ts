import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { getReaderById } from '../readers/route';
import { getLibrarianById } from '../librarians/route';

// Function to format date to DDMMYYYY
function formatDateToDDMMYYYY(date: Date): string {
  // Create a date that's timezone-safe by using UTC methods
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = date.getUTCFullYear().toString();
  return `${day}${month}${year}`;
}

// POST /api/auth - Authenticate user
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log(`Login attempt - Username: ${username}, Password: ${password}`);

    // Check if username is a reader ID
    const reader = await getReaderById(username);
    if (reader) {
      console.log(`Reader found:`, JSON.stringify(reader));

      // Convert reader's date of birth to DDMMYYYY format
      if (reader.dateOfBirth) {
        // Parse the date string from ISO format
        const dateObj = new Date(reader.dateOfBirth);
        console.log(`Original date: ${reader.dateOfBirth}, Date object: ${dateObj}`);

        // Format to DDMMYYYY
        const dob = formatDateToDDMMYYYY(dateObj);
        console.log(`Formatted DOB: ${dob}, User password: ${password}`);

        if (dob === password) {
          console.log('Reader authentication successful');
          return NextResponse.json({
            success: true,
            user: {
              id: reader.id,
              name: reader.name,
              role: 'reader',
              dateOfBirth: reader.dateOfBirth,
              email: reader.id // Set email to be the same as id for backward compatibility
            }
          });
        } else {
          console.log(`Reader password mismatch. Expected: ${dob}, Got: ${password}`);
        }
      } else {
        console.log('Reader has no date of birth recorded');
      }
    } else {
      console.log(`No reader found with ID: ${username}`);
    }

    // Check if username is a librarian ID
    const librarian = await getLibrarianById(username);
    if (librarian) {
      console.log(`Librarian found:`, JSON.stringify(librarian));

      // Convert librarian's date of birth to DDMMYYYY format
      if (librarian.dateOfBirth) {
        // Parse the date string from ISO format
        const dateObj = new Date(librarian.dateOfBirth);
        console.log(`Original date: ${librarian.dateOfBirth}, Date object: ${dateObj}`);

        // Format to DDMMYYYY
        const dob = formatDateToDDMMYYYY(dateObj);
        console.log(`Formatted DOB: ${dob}, User password: ${password}`);

        if (dob === password) {
          console.log('Librarian authentication successful');
          return NextResponse.json({
            success: true,
            user: {
              id: librarian.id,
              name: librarian.name,
              role: 'librarian',
              dateOfBirth: librarian.dateOfBirth,
              email: librarian.id // Set email to be the same as id for backward compatibility
            }
          });
        } else {
          console.log(`Librarian password mismatch. Expected: ${dob}, Got: ${password}`);
        }
      } else {
        console.log('Librarian has no date of birth recorded');
      }
    } else {
      console.log(`No librarian found with ID: ${username}`);
    }

    // Authentication failed
    console.log('Authentication failed - no matching user or incorrect password');
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
