import {
  pgTable,
  text,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

// 👤 Users table (Clerk-compatible: text ID instead of UUID)
export const users = pgTable("User", {
  id: text("id").primaryKey(), // 🔁 CHANGED: uuid → text for Clerk user IDs
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionId: text("subscription_id"),
  subscriptionStatus: text("subscription_status"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 📨 History table — stores all email interaction data
export const history = pgTable("History", {
  id: serial("id").primaryKey(),

  userId: text("user_id").notNull(), // 🔁 CHANGED: uuid → text for Clerk IDs

  subject: text("subject"),
  originalEmail: text("original_email"),
  reply: text("reply"),
  language: text("language"),
  tone: text("tone"),
  message: text("message").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});
