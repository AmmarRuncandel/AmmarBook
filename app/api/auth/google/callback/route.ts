import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { isValidRole, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { exchangeCodeForToken, getGoogleUserInfo, generateRandomPassword, getCallbackRedirectUri } from '@/lib/oauth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=invalid_request', request.url));
    }

    // Validate state from cookie
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.warn('OAuth state mismatch - possible CSRF attack');
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }

    // Exchange code for access token
    const redirectUri = getCallbackRedirectUri(request);
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token from Google');
    }

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokenData.access_token);

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // Check if user exists in database
    const { data: existingUser, error: userError } = await supabaseServer
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('email', googleUser.email)
      .single();

    let user;
    let isNewGoogleUser = false;
    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new account
      const hashedPassword = await bcrypt.hash(generateRandomPassword(), 12);
      const { data: newUser, error: insertError } = await supabaseServer
        .from('users')
        .insert([
          {
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
            password: hashedPassword,
            role: 'user',
            created_at: new Date().toISOString(),
          },
        ])
        .select('id, name, email, role, created_at')
        .single();

      if (insertError || !newUser) {
        throw new Error(`Failed to create user: ${insertError?.message || 'Unknown error'}`);
      }

      user = newUser;
      isNewGoogleUser = true;
    } else if (userError) {
      throw new Error(`Database error: ${userError.message}`);
    } else if (!existingUser) {
      throw new Error('User not found after creation');
    } else {
      user = existingUser;
    }

    // Sesuai alur yang diminta: jika akun Google baru dibuat, kembali ke halaman login.
    if (isNewGoogleUser) {
      return NextResponse.redirect(new URL('/login?registered=google', request.url));
    }

    // Validate role
    if (!isValidRole(user.role)) {
      return NextResponse.redirect(new URL('/login?error=invalid_role', request.url));
    }

    // Sign JWT tokens
    const accessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await signRefreshToken({ userId: user.id });

    // Rotate refresh tokens - delete all previous ones
    await supabaseServer.from('refresh_tokens').delete().eq('user_id', user.id);

    // Insert new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenInsertError } = await supabaseServer.from('refresh_tokens').insert([
      {
        user_id: user.id,
        token: refreshToken,
        expires_at: expiresAt,
      },
    ]);

    if (tokenInsertError) {
      console.error('Failed to insert refresh token:', tokenInsertError);
      throw new Error('Failed to save refresh token');
    }

    // Existing Google user: finalize login by writing session to localStorage then redirect.
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Memproses Login Google...</title>
  </head>
  <body>
    <script>
      try {
        localStorage.setItem('access_token', ${JSON.stringify(accessToken)});
        localStorage.setItem('refresh_token', ${JSON.stringify(refreshToken)});
        localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user))});
        window.location.replace('/');
      } catch (e) {
        window.location.replace('/login?error=oauth_storage_failed');
      }
    </script>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(new URL(`/login?error=callback_error&msg=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
