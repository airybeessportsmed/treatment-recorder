import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Safely parse URL to strip custom 'ssl' parameter which crashes drizzle-kit
let cleanUrl = connectionString;
try {
  const parsed = new URL(connectionString);
  parsed.searchParams.delete("ssl");
  cleanUrl = parsed.toString();
} catch (e) {}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: cleanUrl,
    ssl: {
      rejectUnauthorized: true,
    }
  },
});
