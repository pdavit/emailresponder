// src/lib/db.ts
import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@/db/schema";

// Expect POOLER url at runtime (Primary is only for .env.drizzle / migrations)
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

// Create Neon HTTP client (serverless-safe)
const sql = neon(url);

// Drizzle instance with schema → enables db.query.<table>
export const db = drizzle(sql, { schema });

// Optional: export the raw sql client if you need ad-hoc queries
export { sql };
export type DB = typeof db;
