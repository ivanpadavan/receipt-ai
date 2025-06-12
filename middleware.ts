import { auth, signIn } from "@/app/auth";
import { NextResponse } from 'next/server';

export const middleware = auth(async (req) => {
  if (!req.auth) {
    await signIn("anonymous", { redirect: false });
  }
  return NextResponse.next();
});

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     * - api/auth (auth API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)',
  ],
};
