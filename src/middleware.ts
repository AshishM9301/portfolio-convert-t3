import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that don't require authentication
const publicPaths = ["/", "/login", "/register", "/api/auth"];

// Check if path is public
function isPublicPath(path: string): boolean {
    return publicPaths.some((publicPath) => path === publicPath || path.startsWith(publicPath));
}

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Allow public paths without checking auth
    if (isPublicPath(path)) {
        return NextResponse.next();
    }

    // For protected paths, redirect to login if no session cookie
    // Note: Full session validation happens on the server side
    const hasSessionCookie = request.cookies.has("better-auth.session_token");

    if (!hasSessionCookie) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", path);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from auth pages
    if (hasSessionCookie && (path === "/login" || path === "/register")) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
