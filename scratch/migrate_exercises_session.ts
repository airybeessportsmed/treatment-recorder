import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("[Migration] Connecting to DB...");
  const db = await getDb();
  if (!db) {
    throw new Error("Could not initialize database connection");
  }

  console.log("[Migration] Adding sessionId column to exercises table...");
  
  const ddl = `
    ALTER TABLE \`exercises\` 
    ADD COLUMN \`sessionId\` varchar(50) NOT NULL DEFAULT '';
  `;

  try {
    await db.execute(sql.raw(ddl));
    console.log("[Migration] Column sessionId added successfully!");
  } catch (error) {
    console.error("[Migration] Failed to execute DDL:", error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
