import { supabaseServer } from '@/lib/supabase-server';
import { verifyAccessToken } from '@/lib/jwt';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/me — get current user from access token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { data: user, error } = await supabaseServer
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', payload.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get user info', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
