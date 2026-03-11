'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Book } from '@/types/book';
import BookCard from './components/BookCard';
import BookModal from './components/BookModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import TableView from './components/TableView';
import { SkeletonCard, SkeletonTable } from './components/SkeletonLoader';
import { Plus, Search, BookMarked, TrendingUp, Package, BookOpen, X, Grid3x3, List, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
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

  // Current logged-in user
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // Auth check — redirect to /login if no token
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setCurrentUser(JSON.parse(storedUser)); } catch {}
    }
  }, [router]);

  // Authenticated fetch — auto-refreshes token on 401
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const makeRequest = (token: string | null) =>
      fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers as Record<string, string> || {}),
        },
      });

    let token = localStorage.getItem('access_token');
    let res = await makeRequest(token);

    // Try refresh if 401
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            token = refreshData.data.accessToken;
            localStorage.setItem('access_token', refreshData.data.accessToken);
            localStorage.setItem('refresh_token', refreshData.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(refreshData.data.user));
            setCurrentUser(refreshData.data.user);
            res = await makeRequest(token);
          }
        } catch {}
      }
    }

    // Still 401 — force logout
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      router.replace('/login');
      throw new Error('Unauthorized');
    }

    return res;
  }, [router]);

  // Logout
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {}
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.replace('/login');
  };

  // Fetch books with pagination, search, and filter
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (searchQuery.trim()) params.append('search', searchQuery);
      if (statusFilter !== 'Semua') params.append('status', statusFilter);

      const res = await authFetch(`/api/books?${params}`);
      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      setBooks(json.data || []);
      setTotalBooks(json.pagination.total || 0);
    } catch (error) {
      if ((error as Error).message !== 'Unauthorized') {
        console.error('Error fetching books:', error);
        toast.error('Gagal memuat data buku');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, authFetch]);

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
      const res = await authFetch('/api/books/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (error) {
      if ((error as Error).message !== 'Unauthorized') {
        console.error('Error fetching stats:', error);
      }
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Create book
  const handleCreateBook = async (bookData: Partial<Book>) => {
    try {
      const res = await authFetch('/api/books', {
        method: 'POST',
        body: JSON.stringify(bookData),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success('Buku berhasil ditambahkan');
      setIsModalOpen(false);
      fetchBooks();
      fetchStats();
    } catch (error) {
      if ((error as Error).message !== 'Unauthorized') {
        console.error('Error creating book:', error);
        toast.error('Gagal menambahkan buku');
      }
    }
  };

  // Update book
  const handleUpdateBook = async (bookData: Partial<Book>) => {
    if (!selectedBook) return;
    try {
      const res = await authFetch(`/api/books/${selectedBook.id}`, {
        method: 'PUT',
        body: JSON.stringify(bookData),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success('Buku berhasil diperbarui');
      setIsModalOpen(false);
      setSelectedBook(null);
      fetchBooks();
      fetchStats();
    } catch (error) {
      if ((error as Error).message !== 'Unauthorized') {
        console.error('Error updating book:', error);
        toast.error('Gagal memperbarui buku');
      }
    }
  };

  // Delete book
  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    try {
      const res = await authFetch(`/api/books/${bookToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success('Buku berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setBookToDelete(null);
      if (books.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchBooks();
      }
      fetchStats();
    } catch (error) {
      if ((error as Error).message !== 'Unauthorized') {
        console.error('Error deleting book:', error);
        toast.error('Gagal menghapus buku');
      }
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
          {/* Title & Logout Row */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
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
                <h1 className="text-3xl font-bold tracking-tight">AmmarBook</h1>
                <p className="text-white/80 text-sm mt-0.5 font-medium">Perpustakaan Pinjam Meminjam</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentUser && (
                <span className="text-white/80 text-sm hidden sm:block">
                  Halo, <strong className="text-white">{currentUser.name}</strong>
                </span>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/15 border border-white/25 text-white rounded-lg hover:bg-white/25 transition-colors font-medium text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
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