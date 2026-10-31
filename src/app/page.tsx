import Link from "next/link";
import {
  BookOpenCheck as BookOpenCheckIcon,
  ArrowUpDown as ArrowUpDownIcon,
  Calculator as CalculatorIcon,
  Timer as TimerIcon,
  ShieldCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8 sm:py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-white shadow-md shadow-orange-500/20">
              K
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Kraepelin<span className="text-orange-500">.</span>
              </p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase mt-1">
                ONLINE ASSESSMENT
              </p>
            </div>
          </Link>

          <span className="shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 sm:px-4 sm:py-2 sm:text-sm">
            Tes Rekrutmen Online
          </span>
        </div>
      </header>

      {/* Hero & Petunjuk Pengerjaan */}
      <section className="relative isolate flex flex-1 items-center overflow-hidden py-8 sm:py-12 lg:py-16">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute -right-32 top-1/4 -z-10 h-[350px] w-[350px] rounded-full bg-orange-100/60 blur-3xl sm:h-[500px] sm:w-[500px]" />
        <div className="pointer-events-none absolute -left-32 bottom-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-amber-100/40 blur-3xl sm:h-[400px] sm:w-[400px]" />

        <div className="mx-auto grid w-full max-w-7xl items-start gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:items-center">
          {/* Left Copy */}
          <div className="flex flex-col space-y-6 sm:space-y-7 max-w-2xl mx-auto lg:mx-0">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                PLATFORM ASSESSMENT RESMI
              </div>

              <h1 className="mt-4 text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Selamat Datang di
                <br />
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  TES KORAN KRAEPELIN
                </span>
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Tes Kraepelin mengukur kecepatan kerja, ketelitian, kestabilan emosi, dan ketahanan konsentrasi Anda. Pelajari petunjuk di samping/bawah sebelum memulai assessment.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
              <Link
                href="/data-diri"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-600 active:scale-95"
              >
                Mulai Assessment Sekarang
                <span aria-hidden="true" className="text-lg">→</span>
              </Link>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs sm:text-sm text-slate-600">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-xs">
                ✓
              </span>
              <p>
                Pastikan Anda memahami <strong>contoh penjumlahan</strong> sebelum menekan tombol mulai tes.
              </p>
            </div>
          </div>

          {/* Right Card: Petunjuk Pengerjaan & Contoh Penjumlahan (DITAMPILKAN DI HP & DESKTOP) */}
          <div className="w-full max-w-xl mx-auto lg:max-w-none">
            <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-slate-900/5 space-y-6">
              {/* Card Header */}
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <BookOpenCheckIcon size={22} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Sebelum Memulai Tes
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Panduan pengerjaan Kraepelin
                  </p>
                </div>
              </div>

              {/* Instruction Steps */}
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-bold text-xs">
                    <ArrowUpDownIcon size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Perhatikan Urutan Angka
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Jumlahkan dua angka yang berdekatan dari <strong>bawah ke atas</strong> pada setiap kolom.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-bold text-xs">
                    <CalculatorIcon size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Pahami Cara Menghitung
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Jumlahkan dua angka, dan <strong>hanya tuliskan digit satuannya</strong> jika hasilnya 2 digit.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-bold text-xs">
                    <TimerIcon size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Perhatikan Batas Waktu
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Setiap kolom berganti otomatis saat waktu habis. Kolom yang telah terlewat tidak dapat diisi ulang.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contoh Penjumlahan Box */}
              <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-amber-50/50 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700">
                    CONTOH PENJUMLAHAN
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                    Wajib Dipahami
                  </span>
                </div>

                <div className="mt-3.5 flex items-center justify-center gap-3 sm:gap-4 py-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                    7 + 8 = 15
                  </span>
                  <span className="text-slate-400 font-bold text-xl">→</span>
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-orange-500 text-xl sm:text-2xl font-black text-white shadow-md shadow-orange-500/30">
                      5
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-center text-xs font-medium text-slate-600">
                  Yang diketik hanya angka satuannya: <strong className="text-orange-600 font-bold">5</strong> (bukan 15).
                </p>
              </div>

              {/* Tombol Lanjut di bagian bawah kartu khusus tampilan HP */}
              <div className="pt-1 lg:hidden">
                <Link
                  href="/data-diri"
                  className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 active:scale-95 transition"
                >
                  Lanjutkan Isi Data Diri
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 text-center text-xs text-slate-400 sm:flex-row">
          <p>© Kraepelin Online Assessment Platform</p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-orange-600"
          >
            <ShieldCheck size={14} />
            <span>Portal Recruiter & Admin</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
