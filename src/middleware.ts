// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default clerkMiddleware((auth, req: NextRequest) => {
  const url = req.nextUrl.clone();
  const publicRoutes = [
    '/',
    '/subscribe',
    '/api/subscribe',
    '/api/demo/setup',
    '/api/webhook',
    '/api/checkout',
    '/sign-in',
    '/sign-up',
  ];

  const isPublicRoute = publicRoutes.includes(url.pathname);

  if (!auth.userId && !isPublicRoute) {
    url.pathname = '/sign-in';
    url.searchParams.set('redirect_url', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
