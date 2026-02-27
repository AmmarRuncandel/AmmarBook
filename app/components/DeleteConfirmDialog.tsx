'use client';

import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle?: string;
}

export default function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  bookTitle,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200">
        {/* Warning Icon */}
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-rose-50 rounded-lg flex items-center justify-center mb-4 border-2 border-rose-100">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Buku?</h3>
          
          <p className="text-slate-600 mb-1 text-sm">
            Anda yakin ingin menghapus buku:
          </p>
          
          {bookTitle && (
            <p className="text-base font-semibold text-[#3A8B95] mb-4">
              &ldquo;{bookTitle}&rdquo;
            </p>
          )}
          
          <p className="text-sm text-slate-500">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors font-medium"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
