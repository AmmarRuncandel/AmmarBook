import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthState, buildGoogleAuthUrl, getCallbackRedirectUri } from '@/lib/oauth';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Deteksi apakah request datang dari klien mobile (?mobile=true)
    const isMobile = request.nextUrl.searchParams.get('mobile') === 'true';

    // Generate state for CSRF protection
    const state = generateOAuthState();

    // Build Google auth URL
    const redirectUri = getCallbackRedirectUri(request);
    const authUrl = buildGoogleAuthUrl(clientId, redirectUri, state);

    // Simpan state dan flag mobile ke cookie agar bisa dibaca saat callback.
    // Google hanya meneruskan `code` & `state` — custom query param tidak diteruskan.
    const response = NextResponse.json({ authUrl, success: true });

    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 menit
    });

    response.cookies.set('oauth_mobile', isMobile ? 'true' : 'false', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 menit — sama dengan masa hidup state
    });

    return response;
  } catch (error) {
    console.error('Google OAuth init error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initialize Google login' },
      { status: 500 }
    );
  }
}
