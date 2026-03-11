'use client';

import { Book } from '@/types/book';
import { Edit2, Trash2 } from 'lucide-react';

interface TableViewProps {
  books: Book[];
  isAdmin?: boolean;
  onEdit: (book: Book) => void;
  onDelete: (id: number) => void;
  currentPage?: number;
  itemsPerPage?: number;
}

export default function TableView({ books, isAdmin = false, onEdit, onDelete, currentPage = 1, itemsPerPage = 9 }: TableViewProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Judul Buku
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Penulis
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tahun
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {books.map((book, index) => (
              <tr 
                key={book.id} 
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                  {startIndex + index + 1}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                  {book.title}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {book.author}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                  {book.published_year}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      book.status === 'Tersedia'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {book.status}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(book)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#3A8B95] text-white rounded hover:bg-[#2D6E78] transition-colors font-medium text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(book.id)}
                        className="flex items-center justify-center p-1.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
