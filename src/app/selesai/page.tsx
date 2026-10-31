import Link from "next/link";

export const metadata = {
  title: "Tes Selesai",
};

export default function SelesaiPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <header className="shrink-0 border-b border-orange-100 bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] items-center px-4 py-2 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white">
              K
            </div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                Kraepelin<span className="text-orange-500">.</span>
              </p>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">
                ONLINE ASSESSMENT
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-8 lg:px-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <svg
            fill="none"
            height="32"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            width="32"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Tes Berhasil Dikirim
        </h1>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Jawaban Anda sudah tersimpan dan sedang diproses. Hasil
          assessment akan diberitahukan oleh tim rekrutmen melalui
          email yang Anda cantumkan.
        </p>

        <p className="mt-3 rounded-xl bg-orange-50 px-4 py-2 text-xs font-medium text-orange-700">
          Tutup halaman ini dengan aman — Anda sudah tidak perlu
          melakukan apa pun.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          Kembali ke Halaman Utama
        </Link>
      </section>

      <footer className="shrink-0 border-t border-orange-600 bg-orange-500">
        <div className="mx-auto max-w-[1440px] px-5 py-2.5 text-center text-xs font-medium text-white">
          Kraepelin Online
          <span className="mx-2 text-orange-200">·</span>
          Online Assessment Platform
        </div>
      </footer>
    </main>
  );
}
