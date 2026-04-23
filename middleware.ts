import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const VALID_ROLES = new Set(['admin', 'user']);

/**
 * Routes under /api/auth that are intentionally PUBLIC.
 * Middleware will skip verification for these paths entirely.
 */
const PUBLIC_API_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/refresh',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract JWT string from either:
 *  1. `Authorization: Bearer <token>` header  (preferred for mobile clients)
 *  2. `access_token` HttpOnly cookie          (used by browser sessions)
 */
function extractToken(request: NextRequest): string | null {
  // 1. Authorization header (Flutter / REST clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Cookie (Next.js browser sessions)
  const cookieToken = request.cookies.get('access_token')?.value;
  if (cookieToken) {
    return cookieToken.trim();
  }

  return null;
}

/**
 * Build a plain JSON 401 response — safe for programmatic consumers (Flutter).
 * Never returns HTML or a redirect.
 */
function unauthorizedJson(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        // Prevent any proxy/CDN from caching auth failures
        'Cache-Control': 'no-store',
      },
    }
  );
}

/**
 * Redirect browser users to the login page.
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  // Preserve the originally-requested path so login can redirect back
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware entry-point
// ─────────────────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Identify the nature of the incoming request ───────────────────────
  const isApiRoute = pathname.startsWith('/api/');
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // ── 2. Allow public API auth endpoints to pass through without any check ──
  const isPublicApiAuth = PUBLIC_API_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (isPublicApiAuth) {
    return NextResponse.next();
  }

  // ── 3. Routes that require JWT verification ───────────────────────────────
  //    • /api/books/**   → all book CRUD
  //    • /dashboard/**   → web UI protected pages
  const requiresAuth =
    pathname.startsWith('/api/books') || isDashboardRoute;

  if (!requiresAuth) {
    // All other paths (e.g. /, /register, /static) pass through freely.
    return NextResponse.next();
  }

  // ── 4. Extract token ──────────────────────────────────────────────────────
  const token = extractToken(request);

  if (!token) {
    if (isApiRoute) {
      // API consumers (Flutter) must receive JSON — never a redirect.
      return unauthorizedJson('Authorization token required');
    }
    // Browser users are redirected to /login.
    return redirectToLogin(request);
  }

  // ── 5. Verify token ───────────────────────────────────────────────────────
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);

    // Sanitise role: if not in the allowed set, fall back to 'user'
    const role =
      typeof payload.role === 'string' && VALID_ROLES.has(payload.role)
        ? payload.role
        : 'user';

    // ── 6. Forward verified identity to downstream route handlers ──────────
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id',    String(payload.userId ?? ''));
    requestHeaders.set('x-user-email', String(payload.email  ?? ''));
    requestHeaders.set('x-user-name',  String(payload.name   ?? ''));
    requestHeaders.set('x-user-role',  role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });

  } catch {
    // Token present but invalid / expired
    if (isApiRoute) {
      return unauthorizedJson('Invalid or expired token');
    }
    return redirectToLogin(request);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Matcher — tell Next.js which paths this middleware should run on.
// Only routes listed here are intercepted; everything else is bypassed entirely.
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * Protected UI routes (browser sessions)
     */
    '/dashboard/:path*',

    /*
     * Protected API routes (book CRUD — requires JWT from header OR cookie)
     */
    '/api/books/:path*',

    /*
     * Public auth routes are included so the middleware can short-circuit them
     * quickly WITHOUT running full JWT verification logic.
     * All other /api/auth/* sub-paths (e.g. /api/auth/me, /api/auth/logout)
     * are NOT listed here, so they will also be intercepted and validated.
     */
    '/api/auth/:path*',
  ],
};
