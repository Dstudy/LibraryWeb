const pool = require('../src/lib/db').default;

async function migrateNotifications() {
  console.log('Starting notification table migration...');

  try {
    const connection = await pool.getConnection();

    try {
      // Check if DaDoc column exists
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'thongbao'
        AND COLUMN_NAME = 'DaDoc'
      `);

      // @ts-ignore
      if (columns.length === 0) {
        console.log('Adding DaDoc column to thongbao table...');

        // Add the DaDoc column
        await connection.query(`
          ALTER TABLE thongbao
          ADD COLUMN DaDoc BOOLEAN DEFAULT FALSE
        `);

        console.log('DaDoc column added successfully');
      } else {
        console.log('DaDoc column already exists, skipping migration');
      }

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to get database connection:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
migrateNotifications().catch(console.error);
