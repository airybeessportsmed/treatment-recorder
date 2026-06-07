import "dotenv/config";
import mysql from "mysql2/promise";

async function test() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set in .env!");
    return;
  }
  
  // Extract host name for safe logging
  const hostMatch = dbUrl.match(/@([^:/]+)/);
  const host = hostMatch ? hostMatch[1] : "unknown";
  console.log("Connecting to TiDB host:", host);
  
  try {
    const connection = await mysql.createConnection(dbUrl);
    console.log("Connection object created.");
    const [rows] = await connection.execute("SELECT 1");
    console.log("Query executed successfully, result:", rows);
    await connection.end();
    console.log("Database connection SUCCESS!");
  } catch (error) {
    console.error("Database connection FAILED:", error);
  }
}

test();
