import mysql from 'mysql2/promise';

const oldDbUrl = 'mysql://3wWusUPY7FKqAQS.root:hRtC9R44ZKsl43cWaV1A@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/Wd3jRx8DMBsEi2YbyYmjv8?ssl={"rejectUnauthorized":true}';

async function main() {
  const urlObj = new URL(oldDbUrl);
  urlObj.searchParams.delete("ssl");

  const conn = await mysql.createConnection({
    uri: urlObj.toString(),
    ssl: { rejectUnauthorized: true }
  });

  // Try athletes table in old database
  try {
    const [athletes] = await conn.query('SELECT id, name, number, position FROM athletes ORDER BY number') as any[];
    console.log("Current Athletes in Old DB:");
    console.log(JSON.stringify(athletes, null, 2));
  } catch (err: any) {
    console.error("Error reading athletes from old DB:", err.message);
  }

  // Also try players table in old database if it exists
  try {
    const [players] = await conn.query('SELECT id, name, number, position, isActive FROM players ORDER BY number') as any[];
    console.log("Current Players in Old DB:");
    console.log(JSON.stringify(players, null, 2));
  } catch (err: any) {
    console.error("Error reading players from old DB (maybe doesn't exist):", err.message);
  }

  await conn.end();
}

main().catch(console.error);
