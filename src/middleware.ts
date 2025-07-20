// Clerk middleware - uncomment when Clerk is properly installed
// import { authMiddleware } from '@clerk/nextjs';

// For now, we'll use a placeholder middleware
// Replace this with the actual Clerk middleware when Clerk is installed
export function middleware() {
  // This is a placeholder - replace with actual Clerk middleware
  return;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next
     * - static (static files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next|static|favicon.ico|public).*)',
  ],
};

/*
// Uncomment this when Clerk is properly installed:

import { authMiddleware } from '@clerk/nextjs';
import type { NextRequest } from 'next/server';

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    '/',
    '/subscribe',
    '/api/subscribe',
    '/api/demo/setup',
    '/api/webhook',
    '/api/checkout',
  ],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    '/api/webhook',
  ],
  afterAuth(auth: any, req: NextRequest) {
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return Response.redirect(signInUrl);
    }

    // If the user is logged in and trying to access a protected route, allow them to access route
    if (auth.userId && !auth.isPublicRoute) {
      return;
    }

    // Allow users visiting public routes to access them
    return;
  },
});
*/ 