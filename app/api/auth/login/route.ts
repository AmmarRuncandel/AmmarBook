import { supabaseServer } from '@/lib/supabase-server';
import { isValidRole, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit({
      key: `auth:login:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    // Find user by email (include password for comparison)
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('id, name, email, password, role, created_at')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!isValidRole(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user role configuration' },
        { status: 500 }
      );
    }

    // Sign tokens
    const accessToken = await signAccessToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
    const refreshToken = await signRefreshToken({ userId: user.id });

    // Rotate: delete all previous refresh tokens for this user, insert new one
    await supabaseServer.from('refresh_tokens').delete().eq('user_id', user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseServer.from('refresh_tokens').insert([{
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt,
    }]);

    // Return user without password
    const { password: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { user: safeUser, accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
