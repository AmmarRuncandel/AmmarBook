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

    // Cookie options yang sama untuk kedua mode
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 10 * 60, // 10 menit
    };

    if (isMobile) {
      // Mode Mobile: langsung redirect ke Google agar cookie tersimpan di browser yang sama.
      // Ini menghindari masalah "Invalid State" karena cookie ditulis pada response redirect,
      // bukan pada response terpisah yang dibaca oleh HTTP client (Dio/Flutter).
      const response = NextResponse.redirect(authUrl);
      response.cookies.set('oauth_state', state, cookieOptions);
      response.cookies.set('oauth_mobile', 'true', cookieOptions);
      return response;
    }

    // Mode Web: kembalikan JSON seperti biasa agar frontend web bisa membaca authUrl.
    const response = NextResponse.json({ authUrl, success: true });
    response.cookies.set('oauth_state', state, cookieOptions);
    response.cookies.set('oauth_mobile', 'false', cookieOptions);
    return response;
  } catch (error) {
    console.error('Google OAuth init error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to initialize Google login' },
      { status: 500 }
    );
  }
}
