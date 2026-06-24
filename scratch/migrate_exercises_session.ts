import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("[Migration] Connecting to DB...");
  const db = await getDb();
  if (!db) {
    throw new Error("Could not initialize database connection");
  }

  console.log("[Migration] Adding treatmentRole and trainingRole columns to users table...");

  const ddl1 = `
    ALTER TABLE \`users\` 
    ADD COLUMN \`treatmentRole\` varchar(20) NOT NULL DEFAULT 'write';
  `;

  const ddl2 = `
    ALTER TABLE \`users\` 
    ADD COLUMN \`trainingRole\` varchar(20) NOT NULL DEFAULT 'write';
  `;

  try {
    await db.execute(sql.raw(ddl1));
    console.log("[Migration] Column treatmentRole added successfully!");
  } catch (error) {
    console.warn("[Migration] Column treatmentRole failed or already exists:", error);
  }

  try {
    await db.execute(sql.raw(ddl2));
    console.log("[Migration] Column trainingRole added successfully!");
  } catch (error) {
    console.warn("[Migration] Column trainingRole failed or already exists:", error);
  }

  console.log("[Migration] Migration completed!");
  process.exit(0);
}

main().catch(console.error);
