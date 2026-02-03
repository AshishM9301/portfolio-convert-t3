import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that don't require authentication
// Note: /login and /register are public so unauthenticated users can access them
// Authenticated users are handled client-side (redirected to home)
const publicPaths = ["/", "/login", "/register", "/api/auth"];

// Check if path is public
function isPublicPath(path: string): boolean {
    return publicPaths.some((publicPath) => {
        if (publicPath.endsWith("/*")) {
            // Handle wildcard patterns like "/api/auth/*"
            return path.startsWith(publicPath.slice(0, -2));
        }
        return path === publicPath || path.startsWith(publicPath + "/");
    });
}

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Allow public paths without checking auth
    if (isPublicPath(path)) {
        return NextResponse.next();
    }

    // For protected paths, check session cookie
    const hasSessionCookie = request.cookies.has("better-auth.session_token");

    // Redirect to login if no session cookie
    if (!hasSessionCookie) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", path);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api/trpc|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
