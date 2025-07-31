import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  serial,
} from "drizzle-orm/pg-core";

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

export const history = pgTable("History", {
  id: serial("id").primaryKey(),

  // ✅ required for user association
  userId: uuid("user_id").notNull(),

  // ✅ new fields to support your POST logic
  subject: text("subject"),
  originalEmail: text("original_email"),
  reply: text("reply"),
  language: text("language"),

  // ✅ required field
  message: text("message").notNull(),

  // ✅ timestamp
  createdAt: timestamp("created_at").defaultNow(),
});
