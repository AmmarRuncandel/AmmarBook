'use client';

import Link from 'next/link';
import { RefreshCcw, Home, AlertOctagon } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-6">
        <main className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-5">
            <AlertOctagon className="w-7 h-7 text-rose-600" />
          </div>

          <p className="text-xs font-semibold tracking-widest text-rose-600 mb-2">FATAL ERROR</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Terjadi gangguan serius</h1>
          <p className="mt-3 text-slate-600">
            Maaf, aplikasi sedang mengalami masalah. Silakan coba lagi atau kembali ke halaman utama.
          </p>

          {error?.digest && (
            <p className="mt-4 text-xs text-slate-400">Ref: {error.digest}</p>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#3A8B95] text-white font-semibold hover:bg-[#2D6E78] transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
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
        </main>
      </body>
    </html>
  );
}
