import { supabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/books/stats — protected by JWT middleware
export async function GET() {
  try {
    const [
      { count: total },
      { count: available },
      { count: borrowed },
      { data: latestBook },
    ] = await Promise.all([
      supabaseServer.from('books').select('*', { count: 'exact', head: true }),
      supabaseServer.from('books').select('*', { count: 'exact', head: true }).eq('status', 'Tersedia'),
      supabaseServer.from('books').select('*', { count: 'exact', head: true }).eq('status', 'Dipinjam'),
      supabaseServer
        .from('books')
        .select('published_year')
        .order('published_year', { ascending: false })
        .limit(1)
        .single(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total: total || 0,
        available: available || 0,
        borrowed: borrowed || 0,
        latestYear: latestBook?.published_year || new Date().getFullYear(),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
