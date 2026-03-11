import { supabaseServer } from '@/lib/supabase-server';
import { isValidRole, signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/refresh — refresh token rotation
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit({
      key: `auth:refresh:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak request refresh token. Coba lagi nanti.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify JWT signature first
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Check if token exists in DB and is not expired
    const { data: tokenRecord } = await supabaseServer
      .from('refresh_tokens')
      .select('id, user_id, expires_at')
      .eq('token', refreshToken)
      .eq('user_id', payload.userId)
      .single();

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, message: 'Refresh token not found or already revoked' },
        { status: 401 }
      );
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      await supabaseServer.from('refresh_tokens').delete().eq('id', tokenRecord.id);
      return NextResponse.json(
        { success: false, message: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Get user
    const { data: user } = await supabaseServer
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', payload.userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 401 }
      );
    }

    if (!isValidRole(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user role configuration' },
        { status: 500 }
      );
    }

    // Issue new token pair (rotate refresh token)
    const newAccessToken = await signAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    const newRefreshToken = await signRefreshToken({ userId: user.id });

    await supabaseServer.from('refresh_tokens').delete().eq('id', tokenRecord.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseServer.from('refresh_tokens').insert([{
      user_id: user.id,
      token: newRefreshToken,
      expires_at: expiresAt,
    }]);

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { user, accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Token refresh failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
