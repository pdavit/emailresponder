// src/lib/db.ts
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Expect process.env.DATABASE_URL to be the POOLER url at runtime.
 * Make sure it includes ?sslmode=require
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the client across hot reloads in dev
const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
  __db?: ReturnType<typeof drizzle>;
};

export const pg =
  globalForDb.__pg ??
  postgres(connectionString, {
    // Neon requires SSL; sslmode=require in URL is enough,
    // but this also ensures TLS in case URL is missing it.
    ssl: "require",
    max: 10, // pool size hint (Postgres.js does its own pooling)
  });

export const db = (globalForDb.__db ??= drizzle(pg));

// Cache for dev HMR
globalForDb.__pg = pg;
globalForDb.__db = db;
