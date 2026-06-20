import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

let dbCredentials: any = {};
try {
  const parsed = new URL(connectionString);
  dbCredentials = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "3306", 10),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.split("?")[0].substring(1), // strip search parameters
    ssl: {
      rejectUnauthorized: true,
    }
  };
} catch (e) {
  dbCredentials = {
    url: connectionString,
  };
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials,
});
