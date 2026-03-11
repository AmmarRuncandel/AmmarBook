import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!);
const VALID_ROLES = new Set(['admin', 'user']);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /api/books/* routes with JWT
  if (pathname.startsWith('/api/books')) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const { payload } = await jwtVerify(token, accessSecret);
      const role = typeof payload.role === 'string' && VALID_ROLES.has(payload.role)
        ? payload.role
        : 'user';

      // Forward user info to route handlers via custom headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);
      requestHeaders.set('x-user-email', payload.email as string);
      requestHeaders.set('x-user-role', role);

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/books/:path*',
};
