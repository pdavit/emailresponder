import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSubscriptionStatus } from './lib/subscription'; // Adjust path if needed

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect /emailresponder and all its subroutes
  if (pathname.startsWith('/emailresponder')) {
    const userId = 'demo-user-id'; // Replace with real auth later

    const subscription = await checkSubscriptionStatus(userId);

    if (!subscription?.hasActiveSubscription) {
      const url = request.nextUrl.clone();
      url.pathname = '/subscribe'; // or '/pricing', whichever you prefer
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/emailresponder/:path*'],
};
