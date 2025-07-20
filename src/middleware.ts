import { authMiddleware } from "@clerk/nextjs";
import type { NextRequest } from "next/server";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    '/',
    '/subscribe',
    '/api/subscribe',
    '/api/demo/setup',
    '/api/webhook',
    '/api/checkout',
    '/sign-in',
    '/sign-up',
  ],

  // Routes that can always be accessed (no auth required)
  ignoredRoutes: [
    '/api/webhook',
  ],

  // Redirect unauthenticated users to sign-in
  afterAuth(auth, req: NextRequest) {
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return Response.redirect(signInUrl);
    }

    // Allow authenticated users to access protected routes
    if (auth.userId && !auth.isPublicRoute) {
      return;
    }

    // Allow access to public routes
    return;
  }
});

export const config = {
  matcher: [
    // Match all request paths except for:
    // - _next (Next.js internals)
    // - static files
    // - favicon
    // - public folder
    '/((?!_next|static|favicon.ico|public).*)',
  ],
};
