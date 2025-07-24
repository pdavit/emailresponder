export async function checkSubscriptionStatus(userId: string) {
  // 🧪 TEMP: Always grant access during testing
  return {
    hasActiveSubscription: true,
    subscriptionStatus: "active",
    subscriptionEndDate: null,
  };
}
export const updateUserSubscription = () => {
  // temporary no-op function
  return;
};
