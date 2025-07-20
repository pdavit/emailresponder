// middleware.ts
import { withClerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withClerkMiddleware((req: NextRequest) => {
  const { userId } = getAuth(req);
  const url = req.nextUrl.clone();
  const publicRoutes = [
    "/",
    "/subscribe",
    "/api/subscribe",
    "/api/demo/setup",
    "/api/webhook",
    "/api/checkout",
    "/sign-in",
    "/sign-up",
  ];

  // Allow access to public routes
  if (publicRoutes.includes(url.pathname)) {
    return NextResponse.next();
  }

  // Redirect to sign-in if user is not authenticated
  if (!userId) {
    url.pathname = "/sign-in";
    url.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"], // Match all except _next/static files
};
