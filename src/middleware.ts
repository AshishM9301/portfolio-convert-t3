import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that don't require authentication
const publicPaths = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/api/trpc",
  "/admin", // /admin itself is public (shows login form)
];

// Admin dashboard paths that require admin authentication
const adminPaths = [
  "/admin/dashboard",
];

// Check if path is public
function isPublicPath(path: string): boolean {
  return publicPaths.some((publicPath) => {
    if (publicPath.endsWith("/*")) {
      return path.startsWith(publicPath.slice(0, -2));
    }
    return path === publicPath || path.startsWith(publicPath + "/");
  });
}

// Check if path is an admin path requiring special auth
function isAdminPath(path: string): boolean {
  return adminPaths.some((adminPath) => {
    return path === adminPath || path.startsWith(adminPath + "/");
  });
}

// Check for valid admin authorization header
function hasValidAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  // The token validation happens in the API route, not middleware
  // We just check that a Bearer token exists
  return true;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Add security headers to all responses
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Admin routes get stricter caching control
  if (path.startsWith("/admin")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Allow public paths
  if (isPublicPath(path)) {
    return response;
  }

  // Admin dashboard paths require authorization header
  if (isAdminPath(path)) {
    // For admin routes, we check for Authorization header
    // The actual token validation happens in the tRPC adminProcedure
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No auth header - redirect to admin login page
      // But only redirect for HTML requests
      const accept = request.headers.get("accept") || "";
      if (accept.includes("text/html")) {
        const adminUrl = new URL("/admin", request.url);
        return NextResponse.redirect(adminUrl);
      }
      
      // For non-HTML requests, return 401
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="admin"' },
      });
    }

    return response;
  }

  // For protected non-admin paths, check Better Auth session cookie
  const hasSessionCookie = request.cookies.has("better-auth.session_token");

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
