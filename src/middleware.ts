import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Public pages the user can access without signing in
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/pricing",
    "/demo",
    "/subscribe",
    "/thank-you",
    "/api/webhook",        // Stripe webhook must stay public
    "/api/webhook/clerk",  // Clerk webhook must stay public
  ],

  // Also tell Clerk to ignore these routes entirely (no auth touches)
  ignoredRoutes: [
    "/api/webhook",
    "/api/webhook/clerk",
  ],

  async afterAuth(auth, req) {
    const { userId, isPublicRoute } = auth;
    const url = new URL(req.url);

    // If not signed in and the route isn't public → send to sign-in
    if (!userId && !isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return Response.redirect(signInUrl);
    }

    // Gate /app/* behind an active (or trialing) subscription
    const isAppRoute = url.pathname.startsWith("/app");
    if (userId && isAppRoute) {
      try {
        // ✅ Same-origin URL so Clerk cookies are valid
        const statusUrl = new URL("/api/subscription-status", url.origin);
        const subCheck = await fetch(statusUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // forward the incoming cookies; same-origin makes them valid
            Cookie: req.headers.get("cookie") || "",
          },
        });

        const result = await subCheck.json();

        if (!result?.hasActiveSubscription) {
          return Response.redirect(new URL("/pricing", req.url));
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("❌ Middleware subscription check failed:", err);
        }
        return Response.redirect(new URL("/pricing", req.url));
      }
    }
  },
});

// Keep webhooks out of the middleware path entirely
export const config = {
  matcher: [
    // Exclude /api/webhook and /api/webhook/clerk from middleware
    "/((?!.+\\.[\\w]+$|_next|api/webhook|api/webhook/clerk).*)",
    "/",
    "/(trpc)(.*)",
  ],
};
