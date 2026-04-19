import Image from 'next/image';
import Link from 'next/link';
import { Home, LogIn, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f8fafb] relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-16 w-72 h-72 bg-[#3A8B95]/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-cyan-200/30 rounded-full blur-2xl" />
      </div>

      <section className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center">
        <div className="inline-flex items-center justify-center p-2.5 bg-[#3A8B95]/10 rounded-xl border border-[#3A8B95]/20 mb-6">
          <Image
            src="/logoAmmarbook.png"
            alt="AmmarBook Logo"
            width={64}
            height={64}
            className="rounded"
          />
        </div>

        <p className="text-sm font-semibold tracking-widest text-[#3A8B95] mb-2">ERROR 404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-slate-600">
          Link yang Anda buka mungkin salah, sudah dipindahkan, atau sudah tidak tersedia.
        </p>

        <div className="mt-8 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3 text-left">
          <SearchX className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600">
            Cek kembali URL pada browser, atau kembali ke halaman utama AmmarBook.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#3A8B95] text-white font-semibold hover:bg-[#2D6E78] transition-colors"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Ke Halaman Login
          </Link>
        </div>
      </section>
    </main>
  );
}
