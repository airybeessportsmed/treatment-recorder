import "dotenv/config";
import { getDb } from "../server/db";
import { treatments, exercises, players } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    throw new Error("Could not initialize database connection");
  }

  console.log("Analyzing treatments createdBy...");
  const treatmentCounts = await db
    .select({
      createdBy: treatments.createdBy,
      count: sql<number>`count(*)`
    })
    .from(treatments)
    .groupBy(treatments.createdBy);
  console.log("Treatments by user ID:", treatmentCounts);

  console.log("\nAnalyzing exercises createdBy...");
  const exerciseCounts = await db
    .select({
      createdBy: exercises.createdBy,
      count: sql<number>`count(*)`
    })
    .from(exercises)
    .groupBy(exercises.createdBy);
  console.log("Exercises by user ID:", exerciseCounts);

  console.log("\nAnalyzing players createdBy...");
  const playerCounts = await db
    .select({
      createdBy: players.createdBy,
      count: sql<number>`count(*)`
    })
    .from(players)
    .groupBy(players.createdBy);
  console.log("Players by user ID:", playerCounts);

  process.exit(0);
}

main().catch(console.error);
