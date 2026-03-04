import { supabase } from '@/lib/supabase';
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
    let query = supabase.from('books').select('*', { count: 'exact' });

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

    const { data, error } = await supabase
      .from('books')
      .insert([{ title, author, published_year, status }])
      .select();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        message: 'Book created successfully',
        data: data?.[0],
      },
      { status: 201 }
    );
  } catch (error) {
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
