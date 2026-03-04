import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/books/[id] - Get a single book by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid book ID',
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', Number(id))
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            message: 'Book not found',
          },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch book',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/books/[id] - Update a book
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid book ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, author, published_year, status } = body;

    // Validation - at least one field must be provided
    if (!title && !author && !published_year && !status) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least one field must be provided for update',
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (title) updateData.title = title;
    if (author) updateData.author = author;
    if (published_year) updateData.published_year = published_year;
    if (status) updateData.status = status;

    const { data, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', Number(id))
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Book not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Book updated successfully',
        data: data[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update book',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/books/[id] - Delete a book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid book ID',
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('books')
      .delete()
      .eq('id', Number(id))
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Book not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Book deleted successfully',
        data: data[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete book',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
