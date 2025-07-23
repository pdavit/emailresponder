import { authMiddleware } from "@clerk/nextjs";

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
      const response = await fetch(`${url.origin}/api/subscription-status`, {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      });

      const { hasActiveSubscription } = await response.json();

      if (!hasActiveSubscription) {
        return Response.redirect(new URL("/pricing", req.url));
      }
    }

    // Allow request
    return;
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
