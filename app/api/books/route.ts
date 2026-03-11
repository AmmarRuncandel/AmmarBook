import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/lib/audit-log';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/books - Get all books with search, filter, and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'Semua';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '9');

    // Build query
    let query = supabaseServer.from('books').select('*', { count: 'exact' });

    // Apply search filter
    if (searchQuery.trim()) {
      query = query.or(
        `title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`
      );
    }

    // Apply status filter
    if (statusFilter !== 'Semua') {
      query = query.eq('status', statusFilter);
    }

    // Get total count
    const { count } = await query;

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await query
      .order('id', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch books',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') ?? undefined;
    const userEmail = request.headers.get('x-user-email') ?? undefined;

    // Role check: only admin can create
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      auditLog({
        action: 'create',
        resource: 'books',
        status: 'denied',
        userId,
        userEmail,
        role: userRole ?? 'unknown',
        message: 'Non-admin attempted to create a book',
      });
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, author, published_year, status } = body;

    // Validation
    if (!title || !author || !published_year || !status) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: title, author, published_year, status',
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('books')
      .insert([{ title, author, published_year, status }])
      .select();

    if (error) throw error;

    auditLog({
      action: 'create',
      resource: 'books',
      resourceId: String(data?.[0]?.id ?? ''),
      status: 'success',
      userId,
      userEmail,
      role: userRole ?? 'admin',
      message: 'Book created',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Book created successfully',
        data: data?.[0],
      },
      { status: 201 }
    );
  } catch (error) {
    auditLog({
      action: 'create',
      resource: 'books',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('Error creating book:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create book',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
