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

  const idsToCheck = [1, 60001];

  for (const id of idsToCheck) {
    console.log(`=== Checking ID: ${id} ===`);
    
    // treatments
    const [treatments] = await conn.query('SELECT COUNT(*) as count FROM treatments WHERE playerId = ?', [id]) as any[];
    console.log(`- treatments: ${treatments[0].count}`);

    // exercises
    const [exercises] = await conn.query('SELECT COUNT(*) as count FROM exercises WHERE playerId = ?', [id]) as any[];
    console.log(`- exercises: ${exercises[0].count}`);

    // programs
    const [programs] = await conn.query('SELECT COUNT(*) as count FROM programs WHERE athleteId = ?', [id]) as any[];
    console.log(`- programs: ${programs[0].count}`);

    // records
    const [records] = await conn.query('SELECT COUNT(*) as count FROM records WHERE athleteId = ?', [id]) as any[];
    console.log(`- records: ${records[0].count}`);

    // photos
    const [photos] = await conn.query('SELECT COUNT(*) as count FROM photos WHERE athleteId = ?', [id]) as any[];
    console.log(`- photos: ${photos[0].count}`);
  }

  await conn.end();
}

main().catch(console.error);
