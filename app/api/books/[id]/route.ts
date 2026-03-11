import { supabaseServer } from '@/lib/supabase-server';
import { auditLog } from '@/lib/audit-log';
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

    const { data, error } = await supabaseServer
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
    const userId = request.headers.get('x-user-id') ?? undefined;
    const userEmail = request.headers.get('x-user-email') ?? undefined;

    // Role check: only admin can update
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      auditLog({
        action: 'update',
        resource: 'books',
        status: 'denied',
        userId,
        userEmail,
        role: userRole ?? 'unknown',
        message: 'Non-admin attempted to update a book',
      });
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini' },
        { status: 403 }
      );
    }

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

    const { data, error } = await supabaseServer
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

    auditLog({
      action: 'update',
      resource: 'books',
      resourceId: String(data[0].id),
      status: 'success',
      userId,
      userEmail,
      role: userRole ?? 'admin',
      message: 'Book updated',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Book updated successfully',
        data: data[0],
      },
      { status: 200 }
    );
  } catch (error) {
    auditLog({
      action: 'update',
      resource: 'books',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
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
    const userId = request.headers.get('x-user-id') ?? undefined;
    const userEmail = request.headers.get('x-user-email') ?? undefined;

    // Role check: only admin can delete
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      auditLog({
        action: 'delete',
        resource: 'books',
        status: 'denied',
        userId,
        userEmail,
        role: userRole ?? 'unknown',
        message: 'Non-admin attempted to delete a book',
      });
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini' },
        { status: 403 }
      );
    }

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

    const { data, error } = await supabaseServer
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

    auditLog({
      action: 'delete',
      resource: 'books',
      resourceId: String(data[0].id),
      status: 'success',
      userId,
      userEmail,
      role: userRole ?? 'admin',
      message: 'Book deleted',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Book deleted successfully',
        data: data[0],
      },
      { status: 200 }
    );
  } catch (error) {
    auditLog({
      action: 'delete',
      resource: 'books',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
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
