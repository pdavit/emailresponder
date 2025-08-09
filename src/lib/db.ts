// src/lib/db.ts
import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// HTTP client (works perfectly on Vercel serverless/edge)
const sql = neon(url);

// Drizzle instance
export const db = drizzle(sql);
