import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/pricing",
    "/demo",
    "/subscribe",
    "/thank-you",
    "/api/webhook/clerk",
    "/api/webhook",
    "/api/subscription-status", // 👈 Allow it publicly
  ],
  ignoredRoutes: [
    "/api/webhook/clerk",
    "/api/webhook",
  ],

  async afterAuth(auth, req) {
    const { userId, isPublicRoute } = auth;
    const url = new URL(req.url);

    if (!userId && !isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return Response.redirect(signInUrl);
    }

    const isAppRoute = url.pathname.startsWith("/app");

    if (userId && isAppRoute) {
      try {
       const subCheck = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/subscription-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.get("cookie") || "",
          },
        });

        const result = await subCheck.json();

        if (!result.hasActiveSubscription) {
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

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
