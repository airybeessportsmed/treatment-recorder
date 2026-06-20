import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

async function main() {
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }
  const urlObj = new URL(dbUrl);
  urlObj.searchParams.delete("ssl");

  const conn = await mysql.createConnection({
    uri: urlObj.toString(),
    ssl: { rejectUnauthorized: true }
  });

  // 1. check players table
  try {
    const [players] = await conn.query('SELECT id, name, number, isActive FROM players ORDER BY number') as any[];
    console.log("=== PLAYERS TABLE ===");
    console.log(JSON.stringify(players, null, 2));
  } catch (err: any) {
    console.error("Error reading players:", err.message);
  }

  // 2. check athletes table if it exists in the new DB
  try {
    const [athletes] = await conn.query('SELECT id, name, number FROM athletes ORDER BY number') as any[];
    console.log("=== ATHLETES TABLE ===");
    console.log(JSON.stringify(athletes, null, 2));
  } catch (err: any) {
    console.error("Error reading athletes (maybe doesn't exist):", err.message);
  }

  await conn.end();
}

main().catch(console.error);
