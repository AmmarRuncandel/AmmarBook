'use client';

import { Book } from '@/types/book';
import { Edit2, Trash2, BookOpen, Eye } from 'lucide-react';

interface BookCardProps {
  book: Book;
  isAdmin?: boolean;
  onEdit: (book: Book) => void;
  onDelete: (id: number) => void;
}

export default function BookCard({ book, isAdmin = false, onEdit, onDelete }: BookCardProps) {
  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-5 border-l-4 border-[#3A8B95] hover:border-l-[6px] overflow-hidden">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-[#3A8B95]/5 rounded-bl-full -z-0"></div>
      
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span
          className={`px-3 py-1 rounded text-xs font-semibold ${
            book.status === 'Tersedia'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {book.status}
        </span>
      </div>

      {/* Book Icon */}
      <div className="mb-4 flex items-center gap-3 relative z-10">
        <div className="p-2.5 bg-[#3A8B95]/10 rounded group-hover:bg-[#3A8B95]/15 transition-colors">
          <BookOpen className="w-5 h-5 text-[#3A8B95]" />
        </div>
        <div className="flex-1 pr-16">
          <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#3A8B95] transition-colors line-clamp-1">
            {book.title}
          </h3>
        </div>
      </div>

      {/* Book Details */}
      <div className="space-y-1.5 mb-4 relative z-10">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Penulis:</span>{' '}
          <span className="line-clamp-1">{book.author}</span>
        </p>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-700">Tahun:</span>{' '}
          <span>{book.published_year}</span>
        </p>
      </div>

      {/* Action Buttons — admin only, or read-only indicator for member */}
      {isAdmin ? (
        <div className="flex gap-2 pt-4 border-t border-slate-100 relative z-10">
          <button
            onClick={() => onEdit(book)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3A8B95] text-white rounded hover:bg-[#2D6E78] transition-colors font-medium text-sm"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete(book.id)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors font-medium text-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Eye className="w-3.5 h-3.5" />
            Mode Baca
          </span>
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${
              book.status === 'Tersedia'
                ? 'text-emerald-600'
                : 'text-rose-500'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${
              book.status === 'Tersedia' ? 'bg-emerald-500' : 'bg-rose-400'
            }`} />
            {book.status === 'Tersedia' ? 'Dapat Dipinjam' : 'Sedang Dipinjam'}
          </span>
        </div>
      )}
    </div>
  );
}
