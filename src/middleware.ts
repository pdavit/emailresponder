import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/pricing",
    "/demo",
    "/thank-you",
  ],
  ignoredRoutes: [
    "/api/webhook/clerk", // keep webhooks completely out
  ],
  async afterAuth(auth, req) {
    const { userId, isPublicRoute } = auth;
    if (!userId && !isPublicRoute) {
      // Use Clerk helper URL to avoid odd edge cases
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return Response.redirect(signInUrl);
    }
  },
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*|api/webhook/clerk).*)",
  ],
};
