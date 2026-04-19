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

    // Generate state for CSRF protection
    const state = generateOAuthState();

    // Build Google auth URL
    const redirectUri = getCallbackRedirectUri(request);
    const authUrl = buildGoogleAuthUrl(clientId, redirectUri, state);

    // Store state in cookie for validation on callback
    const response = NextResponse.json({ authUrl, success: true });
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
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
