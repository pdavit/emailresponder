import { withClerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withClerkMiddleware((req: NextRequest) => {
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'], // Skip static files and _next
};
