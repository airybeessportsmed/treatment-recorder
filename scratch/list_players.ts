import mysql from 'mysql2/promise';

const newDbUrl = 'mysql://3wWusUPY7FKqAQS.e1cb3a6ce36e:3uFWhpWZM7XN62AQ41WM@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/GokYB7b6cAycMQ8z4eriap?ssl={"rejectUnauthorized":true}';

async function main() {
  const urlObj = new URL(newDbUrl);
  urlObj.searchParams.delete("ssl");

  const conn = await mysql.createConnection({
    uri: urlObj.toString(),
    ssl: { rejectUnauthorized: true }
  });

  const [players] = await conn.query('SELECT id, name, number, position, isActive FROM players ORDER BY number') as any[];
  console.log("Current Players in DB:");
  console.log(JSON.stringify(players, null, 2));

  await conn.end();
}

main().catch(console.error);
