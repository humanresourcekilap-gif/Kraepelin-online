"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  Clock3,
  TrendingUp,
  ArrowRight,
  Timer,
  Download,
} from "lucide-react";

type CandidateItem = {
  id: string;
  nama: string;
  email: string;
  posisi_dilamar: string;
  jenjang_pendidikan: string;
  kelompok_pendidikan: string;
  created_at: string;
  testStatus: "BELUM_MULAI" | "SEDANG_BERLANGSUNG" | "SELESAI";
  sesi: {
    panker: number | null;
    tianker: number | null;
    janker: number | null;
    hanker: number | null;
    hasil_norma: Record<string, { category?: string }> | null;
  } | null;
};

type Stats = {
  totalKandidat: number;
  totalSelesai: number;
  totalSedangTes: number;
  totalBelumMulai: number;
  avgPanker: number;
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalKandidat: 0,
    totalSelesai: 0,
    totalSedangTes: 0,
    totalBelumMulai: 0,
    avgPanker: 0,
  });
  const [timerSettings, setTimerSettings] = useState<{
    durasiKolomDetik: number;
    durasiTransisiDetik: number;
    totalKolom: number;
    namaPengaturan: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [candRes, setRes] = await Promise.all([
          fetch("/api/admin/kandidat"),
          fetch("/api/admin/pengaturan"),
        ]);

        if (candRes.status === 401) {
          if (active) router.replace("/admin/login");
          return;
        }

        if (candRes.ok) {
          const candData = await candRes.json();
          if (candData.success && active) {
            setCandidates(candData.data || []);
            if (candData.stats) {
              setStats(candData.stats);
            }
          }
        }

        if (setRes.ok && active) {
          const setData = await setRes.json();
          if (setData.success) {
            setTimerSettings(setData.settings);
          }
        }
      } catch (err) {
        console.error("Gagal memuat overview:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ringkasan Asesmen
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitoring performa kandidat dan konfigurasi tes psikometri Kraepelin
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            href="/admin/pengaturan"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Timer size={16} className="text-orange-500" />
            Atur Timer Tes
          </Link>

          <a
            href="/api/admin/export/csv"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Download size={16} />
            Export Rekap CSV
          </a>
        </div>
      </div>

      {/* Timer Banner Active */}
      {timerSettings && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 via-white to-amber-50/50 p-4 sm:p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
              <Timer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  Timer Aktif
                </span>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                  {timerSettings.namaPengaturan}
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                {timerSettings.durasiKolomDetik} detik/kolom · Jeda {timerSettings.durasiTransisiDetik} detik · Total {timerSettings.totalKolom} kolom
              </p>
            </div>
          </div>

          <Link
            href="/admin/pengaturan"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 sm:text-sm"
          >
            Ubah Pengaturan
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Kandidat</span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Users size={17} />
            </div>
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "..." : stats.totalKandidat}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">Terdaftar di sistem</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tes Selesai</span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold text-green-600">
            {loading ? "..." : stats.totalSelesai}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">Siap dievaluasi HR</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sedang Ujian</span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock3 size={17} />
            </div>
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold text-amber-600">
            {loading ? "..." : stats.totalSedangTes}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">Sesi aktif berlangsung</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rata-rata PANKER</span>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <TrendingUp size={17} />
            </div>
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold text-orange-600">
            {loading ? "..." : stats.avgPanker}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">Kecepatan rata-rata</p>
        </div>
      </div>

      {/* Recent Candidates List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Kandidat Terbaru</h2>
            <p className="text-xs text-slate-500">Peserta yang baru mendaftar atau menyelesaikan tes</p>
          </div>
          <Link
            href="/admin/kandidat"
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            Lihat Semua
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Memuat data kandidat...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 px-4">
              Belum ada kandidat yang terdaftar.
            </div>
          ) : (
            candidates.slice(0, 5).map((c) => (
              <div key={c.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{c.nama}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                  <div>
                    {c.testStatus === "SELESAI" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Selesai
                      </span>
                    ) : c.testStatus === "SEDANG_BERLANGSUNG" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Sedang Tes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Belum Mulai
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Posisi: <strong>{c.posisi_dilamar}</strong></span>
                  <Link
                    href={`/admin/kandidat/${c.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    Detail
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Nama & Kontak</th>
                <th className="px-6 py-3.5">Posisi Dilamar</th>
                <th className="px-6 py-3.5">Status Tes</th>
                <th className="px-6 py-3.5">Skor Kraepelin (P / T / J / H)</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Memuat data kandidat...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Belum ada kandidat yang terdaftar.
                  </td>
                </tr>
              ) : (
                candidates.slice(0, 6).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{c.nama}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{c.posisi_dilamar}</span>
                      <p className="text-xs text-slate-400">
                        {c.jenjang_pendidikan} · {c.kelompok_pendidikan}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {c.testStatus === "SELESAI" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Selesai
                        </span>
                      ) : c.testStatus === "SEDANG_BERLANGSUNG" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Sedang Tes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Belum Mulai
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {c.sesi && c.testStatus === "SELESAI" ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded bg-orange-50 px-1.5 py-0.5 font-bold text-orange-700">
                            P: {c.sesi.panker}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                            T: {c.sesi.tianker}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                            J: {c.sesi.janker}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                            H: {c.sesi.hanker}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/kandidat/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition"
                      >
                        Detail
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
