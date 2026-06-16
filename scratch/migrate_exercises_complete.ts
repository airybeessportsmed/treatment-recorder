import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("[Migration] Connecting to DB...");
  const db = await getDb();
  if (!db) {
    throw new Error("Could not initialize database connection");
  }

  console.log("[Migration] Adding isCompleted column to exercises table...");
  
  const ddl = `
    ALTER TABLE \`exercises\` 
    ADD COLUMN \`isCompleted\` int NOT NULL DEFAULT 0;
  `;

  try {
    await db.execute(sql.raw(ddl));
    console.log("[Migration] Column isCompleted added successfully!");
  } catch (error) {
    console.error("[Migration] Failed to execute DDL:", error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
