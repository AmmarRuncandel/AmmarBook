'use client';

import { useState, useEffect } from 'react';
import { Book } from '@/types/book';
import { X } from 'lucide-react';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: Partial<Book>) => void;
  book?: Book | null;
  mode: 'create' | 'edit';
}

export default function BookModal({ isOpen, onClose, onSave, book, mode }: BookModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    published_year: new Date().getFullYear(),
    status: 'Tersedia',
  });

  useEffect(() => {
    if (mode === 'edit' && book) {
      setFormData({
        title: book.title,
        author: book.author,
        published_year: book.published_year,
        status: book.status,
      });
    } else {
      setFormData({
        title: '',
        author: '',
        published_year: new Date().getFullYear(),
        status: 'Tersedia',
      });
    }
  }, [book, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-[#3A8B95]">
          <h2 className="text-xl font-bold text-white">
            {mode === 'create' ? 'Tambah Buku Baru' : 'Edit Buku'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Judul Buku <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#3A8B95] focus:border-[#3A8B95] outline-none transition-all placeholder:text-slate-400 text-slate-900"
              placeholder="Masukkan judul buku"
              required
            />
          </div>

          {/* Author Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Penulis <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#3A8B95] focus:border-[#3A8B95] outline-none transition-all placeholder:text-slate-400 text-slate-900"
              placeholder="Masukkan nama penulis"
              required
            />
          </div>

          {/* Year Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tahun Terbit <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              value={formData.published_year}
              onChange={(e) => setFormData({ ...formData, published_year: parseInt(e.target.value) })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#3A8B95] focus:border-[#3A8B95] outline-none transition-all placeholder:text-slate-400 text-slate-900"
              placeholder="2024"
              min="1900"
              max={new Date().getFullYear()}
              required
            />
          </div>

          {/* Status Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Status <span className="text-rose-600">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-[#3A8B95] focus:border-[#3A8B95] outline-none transition-all bg-white text-slate-900"
              required
            >
              <option value="Tersedia">Tersedia</option>
              <option value="Dipinjam">Dipinjam</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#3A8B95] text-white rounded hover:bg-[#2D6E78] transition-colors font-medium"
            >
              {mode === 'create' ? 'Tambah Buku' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
