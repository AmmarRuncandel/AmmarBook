'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Book } from '@/types/book';
import BookCard from './components/BookCard';
import BookModal from './components/BookModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import TableView from './components/TableView';
import { SkeletonCard, SkeletonTable } from './components/SkeletonLoader';
import { Plus, Search, BookMarked, TrendingUp, Package, BookOpen, X, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Tersedia' | 'Dipinjam'>('Semua');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const itemsPerPage = 9;
  
  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  // Calculate pagination
  const totalPages = Math.ceil(totalBooks / itemsPerPage);

  // Fetch books with pagination, search, and filter
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query
      let query = supabase
        .from('books')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter !== 'Semua') {
        query = query.eq('status', statusFilter);
      }

      // Get total count for this filtered query
      const { count } = await query;
      setTotalBooks(count || 0);

      // Apply pagination and ordering
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error } = await query
        .order('id', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Gagal memuat data buku');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Fetch statistics (total count without pagination)
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    borrowed: 0,
    latestYear: new Date().getFullYear(),
  });

  const fetchStats = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

      const { count: available } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Tersedia');

      const { count: borrowed } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Dipinjam');

      const { data: latestBook } = await supabase
        .from('books')
        .select('published_year')
        .order('published_year', { ascending: false })
        .limit(1)
        .single();

      setStats({
        total: total || 0,
        available: available || 0,
        borrowed: borrowed || 0,
        latestYear: latestBook?.published_year || new Date().getFullYear(),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Create book
  const handleCreateBook = async (bookData: Partial<Book>) => {
    try {
      const { error } = await supabase.from('books').insert([bookData]);
      
      if (error) throw error;
      
      toast.success('Buku berhasil ditambahkan');
      setIsModalOpen(false);
      fetchBooks();
      fetchStats();
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error('Gagal menambahkan buku');
    }
  };

  // Update book
  const handleUpdateBook = async (bookData: Partial<Book>) => {
    if (!selectedBook) return;

    try {
      const { error } = await supabase
        .from('books')
        .update(bookData)
        .eq('id', selectedBook.id);

      if (error) throw error;

      toast.success('Buku berhasil diperbarui');
      setIsModalOpen(false);
      setSelectedBook(null);
      fetchBooks();
      fetchStats();
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Gagal memperbarui buku');
    }
  };

  // Delete book
  const handleDeleteBook = async () => {
    if (!bookToDelete) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookToDelete.id);

      if (error) throw error;

      toast.success('Buku berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setBookToDelete(null);
      
      // If deleting the last item on the current page and not on page 1, go to previous page
      if (books.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchBooks();
      }
      
      fetchStats();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Gagal menghapus buku');
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedBook(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (book: Book) => {
    setModalMode('edit');
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (id: number) => {
    const book = books.find((b) => b.id === id);
    if (book) {
      setBookToDelete(book);
      setIsDeleteDialogOpen(true);
    }
  };

  // Handle search with button
  const handleSearch = () => {
    fetchBooks();
  };

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(58, 139, 149, 0.15)',
            border: '1px solid #e2e8f0',
            fontWeight: '500',
          },
        }}
      />

      {/* Header */}
      <header className="bg-[#3A8B95] text-white shadow-lg border-b-4 border-[#2D6E78] relative overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-1 bg-white/15 rounded-lg border border-white/20">
              <Image
                src="/logoAmmarbook.png"
                alt="AmmarBook Logo"
                width={80}
                height={80}
                className="rounded"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                AmmarBook
              </h1>
              <p className="text-white/80 text-sm mt-0.5 font-medium">
                Perpustakaan Pinjam Meminjam
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 border border-white/25 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-white/75 font-medium">Total Buku</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 border border-white/25 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <BookMarked className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.available}</p>
                  <p className="text-xs text-white/75 font-medium">Tersedia</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 border border-white/25 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <BookMarked className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.borrowed}</p>
                  <p className="text-xs text-white/75 font-medium">Dipinjam</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-sm rounded-lg p-4 border border-white/25 hover:bg-white/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.latestYear}</p>
                  <p className="text-xs text-white/75 font-medium">Terbaru</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Section */}
        <div className="space-y-4 mb-6">
          {/* Top Row: Search, Filter, View Toggle */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="text-slate-400 w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Cari berdasarkan judul atau penulis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3A8B95] focus:border-[#3A8B95] outline-none transition-all bg-white placeholder:text-slate-400 text-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'Semua' | 'Tersedia' | 'Dipinjam')}
                className="w-full lg:w-48 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3A8B95] focus:border-[#3A8B95] outline-none transition-all bg-white text-slate-900 font-medium appearance-none cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Tersedia">Tersedia</option>
                <option value="Dipinjam">Dipinjam</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                  viewMode === 'grid'
                    ? 'bg-[#3A8B95] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                  viewMode === 'table'
                    ? 'bg-[#3A8B95] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <List className="w-5 h-5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#3A8B95] text-white rounded-lg hover:bg-[#2D6E78] active:scale-95 transition-all font-semibold shadow-sm whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Buku</span>
            </button>
          </div>

          {/* Info Row */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Menampilkan <span className="font-bold text-[#3A8B95]">{books.length}</span> dari{' '}
              <span className="font-bold text-[#3A8B95]">{totalBooks}</span> buku
              {statusFilter !== 'Semua' && (
                <span className="ml-2 px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                  Filter: {statusFilter}
                </span>
              )}
            </p>
            {totalPages > 1 && (
              <p className="text-slate-600 font-medium">
                Halaman {currentPage} dari {totalPages}
              </p>
            )}
          </div>
        </div>

        {/* Books Grid/Table */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(itemsPerPage)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <SkeletonTable rows={itemsPerPage} />
          )
        ) : books.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onEdit={openEditModal}
                    onDelete={openDeleteDialog}
                  />
                ))}
              </div>
            ) : (
              <TableView
                books={books}
                onEdit={openEditModal}
                onDelete={openDeleteDialog}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
              />
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Previous Button */}
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-[#3A8B95] text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="text-slate-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center mb-6">
              <BookMarked className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {searchQuery || statusFilter !== 'Semua' ? 'Tidak ada hasil' : 'Belum ada buku'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery || statusFilter !== 'Semua'
                ? 'Coba ubah kata kunci pencarian atau filter Anda'
                : 'Mulai tambahkan buku ke perpustakaan Anda'}
            </p>
            {!searchQuery && statusFilter === 'Semua' && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#3A8B95] text-white rounded-lg hover:bg-[#2D6E78] transition-colors font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Buku Pertama</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <BookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBook(null);
        }}
        onSave={modalMode === 'create' ? handleCreateBook : handleUpdateBook}
        book={selectedBook}
        mode={modalMode}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setBookToDelete(null);
        }}
        onConfirm={handleDeleteBook}
        bookTitle={bookToDelete?.title}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <BookOpen className="w-5 h-5 text-[#3A8B95]" />
              <span className="text-sm font-medium">AmmarBook Perpustakaan Pinjam Meminjam</span>
            </div>
            <div className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} All rights reserved
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}