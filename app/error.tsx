'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#f8fafb] relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-16 w-72 h-72 bg-[#3A8B95]/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-amber-200/25 rounded-full blur-2xl" />
      </div>

      <section className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center">
        <div className="inline-flex items-center justify-center p-2.5 bg-amber-100 rounded-xl border border-amber-200 mb-6">
          <Image
            src="/logoAmmarbook.png"
            alt="AmmarBook Logo"
            width={64}
            height={64}
            className="rounded"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-3">
          <AlertTriangle className="w-4 h-4" />
          TERJADI KESALAHAN
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
          Oops, ada masalah di sistem
        </h1>
        <p className="mt-3 text-slate-600">
          Permintaan Anda belum dapat diproses saat ini. Silakan coba ulang beberapa saat lagi.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#3A8B95] text-white font-semibold hover:bg-[#2D6E78] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </Link>
        </div>
      </section>
    </main>
  );
}
