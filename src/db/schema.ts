import {
  pgTable,
  text,
  timestamp,
  uuid,
  serial,
} from "drizzle-orm/pg-core";

// 🧑 Users table
export const users = pgTable("User", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionId: text("subscription_id"),
  subscriptionStatus: text("subscription_status"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 📜 History table — fully expanded for insert compatibility
export const history = pgTable("History", {
  id: serial("id").primaryKey(),

  userId: uuid("user_id").notNull(),

  subject: text("subject"),
  originalEmail: text("original_email"),
  reply: text("reply"),
  language: text("language"),
  tone: text("tone"),

  message: text("message").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});
