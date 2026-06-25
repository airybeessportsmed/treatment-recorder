import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";

async function main() {
  console.log("Connecting to DB...");
  const db = await getDb();
  if (!db) {
    throw new Error("Could not initialize database connection");
  }

  console.log("Fetching all active users...");
  const allUsers = await db.select().from(users);

  console.log("\n--- Active Users List ---");
  allUsers.forEach((u) => {
    console.log({
      id: u.id,
      openId: u.openId,
      name: u.name,
      email: u.email,
      loginMethod: u.loginMethod,
      role: u.role,
      treatmentRole: u.treatmentRole,
      trainingRole: u.trainingRole,
      isActive: u.isActive,
      createdAt: u.createdAt,
    });
  });

  console.log("Total users:", allUsers.length);
  process.exit(0);
}

main().catch(console.error);
