import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const subscriptions = pgTable('subscriptions', {
  userId: varchar('user_id', { length: 256 }).primaryKey(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 256 }).notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 256 }).notNull(),
  status: varchar('status', { length: 256 }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
});
