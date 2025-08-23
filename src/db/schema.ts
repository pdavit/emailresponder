// src/db/schema.ts
import {
  pgTable,
  text,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

/**
 * 👤 Users table (Firebase-compatible: text ID instead of UUID)
 * Payment fields removed - will be re-added when Stripe is integrated
 */
export const users = pgTable("User", {
  id: text("id").primaryKey(), // Firebase user ID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * 📨 History table — stores all email interaction data
 * (unchanged)
 */
export const history = pgTable("History", {
  id: serial("id").primaryKey(),

  userId: text("user_id").notNull(), // Firebase user ID

  subject: text("subject"),
  originalEmail: text("original_email"),
  reply: text("reply"),
  language: text("language"),
  tone: text("tone"),
  message: text("message").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});
