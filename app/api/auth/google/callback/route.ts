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

    // ── Validasi state (CSRF protection) ──────────────────────────────────────
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.warn('OAuth state mismatch - possible CSRF attack');
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }

    // ── Baca flag mobile dari cookie (disisipkan saat inisiasi OAuth) ──────────
    // Google hanya meneruskan `code` & `state`, sehingga ?mobile=true tidak
    // tersedia di sini. Flag sudah disimpan ke cookie `oauth_mobile` sebelumnya.
    const isMobile = request.cookies.get('oauth_mobile')?.value === 'true';

    // ── Tukar code dengan access token Google ─────────────────────────────────
    const redirectUri = getCallbackRedirectUri(request);
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token from Google');
    }

    // ── Ambil info user dari Google ───────────────────────────────────────────
    const googleUser = await getGoogleUserInfo(tokenData.access_token);

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // ── Cek apakah user sudah ada di database ─────────────────────────────────
    const { data: existingUser, error: userError } = await supabaseServer
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('email', googleUser.email)
      .single();

    let user;
    let isNewGoogleUser = false;

    if (userError && userError.code === 'PGRST116') {
      // User belum ada — buat akun baru
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

    // ── Akun Google baru: arahkan kembali ke halaman login/registrasi ─────────
    if (isNewGoogleUser) {
      if (isMobile) {
        // Mobile: gunakan deep link untuk memberitahu Flutter akun baru terdaftar
        return NextResponse.redirect(
          new URL('ammarbook://login-callback?error=new_account_registered')
        );
      }
      return NextResponse.redirect(new URL('/login?registered=google', request.url));
    }

    // ── Validasi role ─────────────────────────────────────────────────────────
    if (!isValidRole(user.role)) {
      if (isMobile) {
        return NextResponse.redirect(
          new URL('ammarbook://login-callback?error=invalid_role')
        );
      }
      return NextResponse.redirect(new URL('/login?error=invalid_role', request.url));
    }

    // ── Sign JWT tokens ───────────────────────────────────────────────────────
    const accessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const refreshToken = await signRefreshToken({ userId: user.id });

    // ── Rotasi refresh token — hapus semua yang lama, simpan yang baru ─────────
    await supabaseServer.from('refresh_tokens').delete().eq('user_id', user.id);

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

    // ── Hapus cookie OAuth yang sudah tidak diperlukan ────────────────────────
    const clearCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
    };

    // ════════════════════════════════════════════════════════════════════════════
    // PERCABANGAN: Mobile vs Web
    // ════════════════════════════════════════════════════════════════════════════

    if (isMobile) {
      // ── MOBILE: Deep Link redirect ke Flutter app ─────────────────────────────
      // Token dikirim via custom URL scheme ammarbook://
      // Flutter menangkap ini dengan package `app_links` atau `uni_links`.
      const deepLinkUrl = new URL('ammarbook://login-callback');
      deepLinkUrl.searchParams.set('accessToken', accessToken);
      deepLinkUrl.searchParams.set('refreshToken', refreshToken);

      const mobileResponse = NextResponse.redirect(deepLinkUrl);

      // Bersihkan cookie OAuth
      mobileResponse.cookies.set('oauth_state', '', clearCookieOptions);
      mobileResponse.cookies.set('oauth_mobile', '', clearCookieOptions);

      return mobileResponse;
    }

    // ── WEB: Injeksi token ke localStorage lalu redirect ke dashboard ──────────
    // Menggunakan HTML intermediate page karena cookie HttpOnly tidak bisa
    // diakses oleh JavaScript di sisi client, dan localStorage harus diisi
    // dari sisi browser.
    const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Memproses Login Google...</title>
    <style>
      body { font-family: sans-serif; display: flex; align-items: center;
             justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #94a3b8; }
      p { font-size: 1rem; }
    </style>
  </head>
  <body>
    <p>Mengalihkan, harap tunggu...</p>
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

    const webResponse = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

    // Bersihkan cookie OAuth
    webResponse.cookies.set('oauth_state', '', clearCookieOptions);
    webResponse.cookies.set('oauth_mobile', '', clearCookieOptions);

    return webResponse;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/login?error=callback_error&msg=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
