import { authMiddleware } from "@clerk/nextjs";
import { checkSubscriptionStatus } from "@/lib/subscription";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/pricing",
    "/demo",
    "/subscribe",
    "/api/webhook/clerk",
    "/api/webhook/stripe",
  ],
  ignoredRoutes: [
    "/api/webhook/clerk",
    "/api/webhook/stripe",
  ],

  async afterAuth(auth, req) {
    const { userId, isPublicRoute } = auth;
    const url = new URL(req.url);

    // Not signed in and not on public route
    if (!userId && !isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return Response.redirect(signInUrl);
    }

    // If signed in and accessing /app, verify subscription
    const isAppRoute = url.pathname.startsWith("/app");

    if (userId && isAppRoute) {
      try {
        const subscription = await checkSubscriptionStatus(userId);

        if (!subscription?.hasActiveSubscription) {
          return Response.redirect(new URL("/pricing", req.url));
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to verify subscription:", error);
        }
        return Response.redirect(new URL("/pricing", req.url));
      }
    }
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
