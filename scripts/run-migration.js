const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  console.log("Starting database migration...");

  // Read database configuration from environment variables or use defaults
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "1",
    database: process.env.DB_NAME || "Library",
    multipleStatements: true, // Important for running multiple SQL statements
  };

  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database successfully");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "modify-idluotmuon-column.sql");
    const sqlScript = fs.readFileSync(sqlFilePath, "utf8");

    console.log("Executing SQL migration script...");

    // Execute the SQL script
    const [results] = await connection.query(sqlScript);

    console.log("Migration completed successfully");
    console.log("Results:", results);
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

// Run the migration
runMigration().catch(console.error);
