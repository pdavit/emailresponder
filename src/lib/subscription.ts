export async function checkSubscriptionStatus(userId: string) {
  // 🧪 TEMP: Always grant access during testing
  return {
    hasActiveSubscription: true,
    subscriptionStatus: "active",
    subscriptionEndDate: null,
  };
}
export const updateUserSubscription = (
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: string,
  subscriptionEndDate: Date | null
) => {
  // TODO: Implement actual DB logic
  return;
};
