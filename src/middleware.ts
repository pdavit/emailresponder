import { authMiddleware } from "@clerk/nextjs";
import { getUserSubscriptionStatus } from "@/lib/subscription";

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

    // 1. Not authenticated & accessing private route
    if (!userId && !isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return Response.redirect(signInUrl);
    }

    // 2. User is trying to access /app but we need to check subscription
    const isAppRoute = url.pathname.startsWith("/app");

    if (userId && isAppRoute) {
      const subscription = await getUserSubscriptionStatus(userId);

      if (!subscription?.isActive) {
        return Response.redirect(new URL("/pricing", req.url));
      }
    }

    // ✅ Allow normal behavior
    return;
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
