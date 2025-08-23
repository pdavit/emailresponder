// middleware.ts
import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes anyone can hit without being signed in
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/pricing",
    "/demo",
    "/thank-you",

    // Webhooks must be public
    "/api/webhook/clerk",    // Clerk
  ],

  // Tell Clerk to ignore these completely (no auth checks at all)
  ignoredRoutes: [
    "/api/webhook/clerk",
  ],

  async afterAuth(auth, req) {
    const { userId, isPublicRoute } = auth;
    const url = new URL(req.url);

    // If not signed in and route isn't public → send to sign-in
    if (!userId && !isPublicRoute) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return Response.redirect(signInUrl);
    }

    // TODO: Re-gate /app/* behind subscription after Stripe reintegration
    // For now, allow access to all authenticated users
  },
});

// Keep webhooks out of the middleware matcher entirely
export const config = {
  matcher: [
    // Exclude static files, _next, and webhook endpoints
    "/((?!.+\\.[\\w]+$|_next|api/webhook/clerk).*)",
    "/",
    "/(trpc)(.*)",
  ],
};
