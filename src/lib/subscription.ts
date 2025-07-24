import { db } from "@/lib/db"; // your Prisma instance
import { subscriptions } from "@/lib/db/schema"; // adjust path as needed
import { eq } from "drizzle-orm"; // if using drizzle, else adjust for Prisma

export async function checkSubscriptionStatus(userId: string) {
  try {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    const now = new Date();

    const isActive =
      subscription &&
      subscription.status === "active" &&
      subscription.stripePriceId &&
      (!subscription.endsAt || new Date(subscription.endsAt) > now);

    return {
      hasActiveSubscription: Boolean(isActive),
      subscriptionStatus: subscription?.status ?? null,
      subscriptionEndDate: subscription?.endsAt ?? null,
    };
  } catch (error) {
    console.error("Failed to check subscription:", error);
    return {
      hasActiveSubscription: false,
      subscriptionStatus: null,
      subscriptionEndDate: null,
    };
  }
}
