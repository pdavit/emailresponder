// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit reads env when invoked (we'll inject .env.drizzle in scripts)
    url: process.env.DATABASE_URL!,
  },
  // Optional, but good for larger schemas:
  // strict: true,
  // verbose: true,
});
