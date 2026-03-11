import { supabaseServer } from '@/lib/supabase-server';
import { isValidRole, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// POST /api/auth/register
// SQL required in Supabase:
// CREATE TABLE users (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   name text NOT NULL,
//   email text UNIQUE NOT NULL,
//   password text NOT NULL,
//   created_at timestamptz DEFAULT now()
// );
// CREATE TABLE refresh_tokens (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid REFERENCES users(id) ON DELETE CASCADE,
//   token text UNIQUE NOT NULL,
//   expires_at timestamptz NOT NULL,
//   created_at timestamptz DEFAULT now()
// );

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit({
      key: `auth:register:${ip}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const retryAfter = Math.ceil((rate.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan register. Coba lagi nanti.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: name, email, password' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error } = await supabaseServer
      .from('users')
      .insert([{ name, email, password: hashedPassword }])
      .select('id, name, email, role, created_at')
      .single();

    if (error) throw error;

    if (!isValidRole(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user role configuration' },
        { status: 500 }
      );
    }

    // Sign tokens
    const accessToken = await signAccessToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
    const refreshToken = await signRefreshToken({ userId: user.id });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseServer.from('refresh_tokens').insert([{
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt,
    }]);

    return NextResponse.json(
      { success: true, message: 'User registered successfully', data: { user, accessToken, refreshToken } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
