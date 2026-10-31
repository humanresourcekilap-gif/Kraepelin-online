"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  RotateCcw,
  TrendingUp,
  Activity,
  Target,
  BarChart3,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { hitungInterpretasiKraepelin } from "@/lib/kraepelin-interpretasi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

type CandidateDetail = {
  id: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  email: string;
  nomor_hp: string;
  posisi_dilamar: string;
  jenjang_pendidikan: string;
  jurusan: string;
  kelompok_pendidikan: string;
  created_at: string;
};

type AssessmentSessionDetail = {
  id: string;
  id_kandidat: string;
  status: string;
  dimulai_pada: string;
  batas_waktu: string;
  selesai_pada?: string;
  alasan_selesai?: string;
  panker: number | null;
  tianker: number | null;
  janker: number | null;
  hanker: number | null;
  hasil_norma: Record<string, { category?: string }> | null;
  durasi_kolom_detik?: number;
};

type ColumnBreakdown = {
  kolom: number;
  benar: number;
  salah: number;
  kosong: number;
  terjawab: number;
  posisiTerakhir: number;
  skipDiperhitungkan: number;
};

function getNormBadgeColor(category: string | undefined | null) {
  switch (category) {
    case "BAIK_SEKALI":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "BAIK":
      return "bg-green-100 text-green-800 border-green-200";
    case "SEDANG":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "KURANG":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "KURANG_SEKALI":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: candidateId } = use(params);

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [session, setSession] = useState<AssessmentSessionDetail | null>(null);
  const [breakdown, setBreakdown] = useState<ColumnBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await fetch(`/api/admin/kandidat/${candidateId}`);
        if (!res.ok) {
          if (active) router.replace("/admin/kandidat");
          return;
        }
        const data = await res.json();
        if (data.success && active) {
          setCandidate(data.candidate);
          setSession(data.sesi);
          setBreakdown(data.breakdownPerKolom || []);
        }
      } catch (err) {
        console.error("Gagal memuat detail kandidat:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [candidateId, router]);

  async function handleResetSession() {
    if (!confirm("Apakah Anda yakin ingin mereset sesi tes untuk kandidat ini? Semua jawaban akan dihapus dan tes dapat diulang.")) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`/api/admin/kandidat/${candidateId}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert("Sesi tes berhasil direset.");
        window.location.reload();
      } else {
        alert(data.message || "Gagal mereset sesi.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setResetting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function copyCandidateTestLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const testLink = `${origin}/assessment?candidateId=${candidateId}`;
    navigator.clipboard.writeText(testLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Memuat berkas psikometri kandidat...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <p className="text-base font-semibold text-slate-800">Kandidat tidak ditemukan.</p>
        <Link href="/admin/kandidat" className="mt-4 inline-block text-sm text-orange-600 font-bold">
          ← Kembali ke Daftar Kandidat
        </Link>
      </div>
    );
  }

  // Siapkan data grafik Recharts (50 kolom)
  const chartData = breakdown.map((item) => ({
    kolom: `K${item.kolom}`,
    kolomNomor: item.kolom,
    benar: item.benar,
    salah: item.salah,
    skip: item.skipDiperhitungkan,
    terjawab: item.terjawab,
  }));

  const pankerVal = session?.panker !== null && session?.panker !== undefined ? Number(session.panker) : null;
  const tiankerVal = session?.tianker !== null && session?.tianker !== undefined ? Number(session.tianker) : null;
  const jankerVal = session?.janker !== null && session?.janker !== undefined ? Number(session.janker) : null;
  const hankerVal = session?.hanker !== null && session?.hanker !== undefined ? Number(session.hanker) : null;

  const norma = session?.hasil_norma || {};

  const interpretasi =
    session && session.status === "SELESAI" && pankerVal !== null
      ? hitungInterpretasiKraepelin({
          panker: pankerVal,
          tianker: tiankerVal,
          janker: jankerVal,
          hanker: hankerVal,
          norma: session.hasil_norma,
          namaKandidat: candidate?.nama,
          posisiDilamar: candidate?.posisi_dilamar,
        })
      : null;

  return (
    <div className="space-y-8 print:p-0 print:space-y-6">
      {/* Navigation & Header (Hidden on Print) */}
      <div className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <Link
          href="/admin/kandidat"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} />
          Kembali ke Daftar Kandidat
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyCandidateTestLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            {copied ? "Link Tersalin!" : "Salin Link Tes"}
          </button>

          {session && (
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetSession}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 transition disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Reset Sesi Tes
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 transition"
          >
            <Printer size={16} />
            Cetak / Download PDF
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start border-b border-slate-100 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white shadow-md shadow-orange-500/25">
              {candidate.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
                  {candidate.nama}
                </h1>
                {session?.status === "SELESAI" ? (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    Selesai
                  </span>
                ) : session?.status === "SEDANG_BERLANGSUNG" ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 animate-pulse">
                    Sedang Tes
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    Belum Mulai
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-orange-600">
                Posisi: {candidate.posisi_dilamar}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Terdaftar: {new Date(candidate.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs space-y-1.5 min-w-[220px]">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Parameter Norma
            </p>
            <p className="text-slate-600">
              Jenjang: <strong className="text-slate-800">{candidate.jenjang_pendidikan}</strong>
            </p>
            <p className="text-slate-600">
              Kelompok: <strong className="text-slate-800">{candidate.kelompok_pendidikan}</strong>
            </p>
            <p className="text-slate-600">
              Jurusan: <strong className="text-slate-800">{candidate.jurusan}</strong>
            </p>
          </div>
        </div>

        {/* Profil Kontak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Email</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">{candidate.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Nomor HP / WA</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">{candidate.nomor_hp}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Tempat / Tgl Lahir</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {candidate.tempat_lahir}, {candidate.tanggal_lahir}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Alasan Selesai</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {session?.alasan_selesai || "-"}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Kartu Indikator Psikometri Kraepelin */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Hasil & Indikator Psikometri Kraepelin
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* PANKER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                PANKER (Kecepatan)
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <TrendingUp size={15} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {pankerVal !== null ? pankerVal : "-"}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Rata-rata jawaban benar / kolom</p>
            </div>
            {norma.panker?.category && (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-500">Evaluasi:</span>
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-center ${getNormBadgeColor(norma.panker.category)}`}>
                  {norma.panker.category}
                </span>
              </div>
            )}
          </div>

          {/* TIANKER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                TIANKER (Ketelitian)
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Target size={15} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {tiankerVal !== null ? tiankerVal : "-"}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Total kesalahan</p>
            </div>
            {norma.tianker?.category && (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-500">Evaluasi:</span>
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-center ${getNormBadgeColor(norma.tianker.category)}`}>
                  {norma.tianker.category}
                </span>
              </div>
            )}
          </div>

          {/* JANKER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                JANKER (Kestabilan)
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Activity size={15} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {jankerVal !== null ? jankerVal : "-"}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Deviasi rata-rata</p>
            </div>
            {(norma.janker?.category || (norma as Record<string, { category?: string }>).jankerAverageDeviation?.category) && (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-500">Evaluasi:</span>
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-center ${getNormBadgeColor(norma.janker?.category || (norma as Record<string, { category?: string }>).jankerAverageDeviation?.category || "")}`}>
                  {norma.janker?.category || (norma as Record<string, { category?: string }>).jankerAverageDeviation?.category}
                </span>
              </div>
            )}
          </div>

          {/* HANKER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                HANKER (Ketahanan)
              </span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <BarChart3 size={15} />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {hankerVal !== null ? hankerVal : "-"}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Kemiringan kurva kerja</p>
            </div>
            {norma.hanker?.category && (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[10px] sm:text-[11px] text-slate-500">Evaluasi:</span>
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-center ${getNormBadgeColor(norma.hanker.category)}`}>
                  {norma.hanker.category}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evaluasi Psikologis & Rekomendasi HR */}
      {interpretasi && (
        <div className="rounded-2xl sm:rounded-3xl border border-orange-200/90 bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30 p-5 sm:p-8 shadow-sm space-y-6">
          {/* Executive Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm">
                  <Sparkles size={14} />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600">
                  Evaluasi Psikologis & Rekomendasi HR
                </span>
              </div>
              <h3 className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {interpretasi.tipeGayaKerja}
              </h3>
            </div>

            {/* Status Rekomendasi Pill */}
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 font-bold text-xs sm:text-sm shadow-sm ${interpretasi.warnaBadge.bg} ${interpretasi.warnaBadge.text} ${interpretasi.warnaBadge.border}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${interpretasi.warnaBadge.dot}`} />
              {interpretasi.labelRekomendasi}
            </div>
          </div>

          {/* Ringkasan Karakter & Dinamika Kerja */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Ringkasan Karakter & Dinamika Kerja
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
              {interpretasi.ringkasanEksekutif}
            </p>
          </div>

          {/* 4 Pilar Analisis Mendalam */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Analisis Per Dimensi Psikometri
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Kecepatan */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">
                    {interpretasi.aspek.kecepatan.nama}
                  </span>
                  <span className="rounded-md bg-orange-100 text-orange-800 px-2 py-0.5 text-[10px] font-bold">
                    {interpretasi.aspek.kecepatan.labelKategori}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {interpretasi.aspek.kecepatan.analisis}
                </p>
              </div>

              {/* Ketelitian */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">
                    {interpretasi.aspek.ketelitian.nama}
                  </span>
                  <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                    {interpretasi.aspek.ketelitian.labelKategori}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {interpretasi.aspek.ketelitian.analisis}
                </p>
              </div>

              {/* Kestabilan */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">
                    {interpretasi.aspek.kestabilan.nama}
                  </span>
                  <span className="rounded-md bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">
                    {interpretasi.aspek.kestabilan.labelKategori}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {interpretasi.aspek.kestabilan.analisis}
                </p>
              </div>

              {/* Ketahanan */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">
                    {interpretasi.aspek.ketahanan.nama}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                      {interpretasi.aspek.ketahanan.labelKategori}
                    </span>
                    <span className="rounded-md bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-semibold">
                      Tren: {interpretasi.aspek.ketahanan.trenKurva}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {interpretasi.aspek.ketahanan.analisis}
                </p>
              </div>
            </div>
          </div>

          {/* Kekuatan vs Area Perhatian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kekuatan Utama */}
            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-200/80 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Kekuatan & Keunggulan Kerja</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {interpretasi.kekuatanUtama.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Area Perhatian / Risiko */}
            <div className="rounded-2xl bg-amber-50/50 border border-amber-200/80 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs sm:text-sm">
                <AlertCircle size={16} className="text-amber-600" />
                <span>Area Perhatian & Mitigasi Risiko</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {interpretasi.areaPengembangan.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Saran Penempatan Posisi */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
              <Briefcase size={16} className="text-orange-500" />
              <span>Saran Kesesuaian Posisi Kerja (Job Fit)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interpretasi.rekomendasiPenempatan.map((pos, idx) => (
                <span
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {pos}
                </span>
              ))}
            </div>
          </div>

          {/* Panduan Pertanyaan Wawancara HR */}
          <div className="rounded-2xl bg-white border border-orange-200 p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-orange-800 font-bold text-xs sm:text-sm">
              <HelpCircle size={16} className="text-orange-600" />
              <span>Panduan Pendalaman Wawancara HR (Interview Probing Points)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Gunakan pertanyaan berikut saat sesi wawancara untuk mengklarifikasi potensi risiko atau memvalidasi keunggulan kerja kandidat:
            </p>
            <div className="space-y-2">
              {interpretasi.panduanWawancaraHR.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-200 text-orange-800 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <p>{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visualisasi Kurva Kerja Kraepelin (50 Kolom) */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kurva Kerja Kraepelin (50 Kolom)
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi dinamika kecepatan kerja (jawaban benar) per kolom dari awal hingga akhir tes
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-slate-700">Jawaban Benar (Y)</span>
            </div>
            {pankerVal !== null && (
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-emerald-500 border border-emerald-500" />
                <span className="text-slate-700">Rata-rata PANKER ({pankerVal})</span>
              </div>
            )}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Belum ada rekaman jawaban kolom untuk divisualisasikan.
          </div>
        ) : (
          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="kolomNomor"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={4}
                  stroke="#cbd5e1"
                />
                <YAxis
                  domain={[0, 27]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  stroke="#cbd5e1"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ColumnBreakdown;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900 border-b pb-1">
                            Kolom {data.kolom}
                          </p>
                          <p className="text-emerald-600 font-semibold">
                            Benar: {data.benar}
                          </p>
                          <p className="text-rose-600 font-semibold">
                            Salah: {data.salah}
                          </p>
                          <p className="text-amber-600 font-semibold">
                            Terlewat: {data.skipDiperhitungkan}
                          </p>
                          <p className="text-slate-500 pt-1 border-t text-[11px]">
                            Posisi Jawaban Terakhir: {data.posisiTerakhir} / 27
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {pankerVal !== null && (
                  <ReferenceLine
                    y={pankerVal}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: `Mean: ${pankerVal}`,
                      position: "insideTopRight",
                      fill: "#10b981",
                      fontSize: 11,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="benar"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "#f97316" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Rincian 50 Kolom (Tabel Terperinci) */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Rincian Lengkap Jawaban Tiap Kolom (1–50)
          </h2>
          <p className="text-xs text-slate-500">
            Detail perhitungan perolehan angka benar, salah, dan skip per interval kolom
          </p>
        </div>

        <div className="max-h-96 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Nomor Kolom</th>
                <th className="px-6 py-3">Benar</th>
                <th className="px-6 py-3">Salah</th>
                <th className="px-6 py-3">Terlewat (Skip)</th>
                <th className="px-6 py-3">Total Terjawab</th>
                <th className="px-6 py-3">Posisi Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada rincian jawaban tersimpan.
                  </td>
                </tr>
              ) : (
                breakdown.map((row) => (
                  <tr key={row.kolom} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5 font-bold text-slate-900">
                      Kolom {row.kolom}
                    </td>
                    <td className="px-6 py-2.5 font-semibold text-emerald-600">
                      {row.benar}
                    </td>
                    <td className="px-6 py-2.5 font-semibold text-rose-600">
                      {row.salah}
                    </td>
                    <td className="px-6 py-2.5 font-semibold text-amber-600">
                      {row.skipDiperhitungkan}
                    </td>
                    <td className="px-6 py-2.5 text-slate-700">
                      {row.terjawab}
                    </td>
                    <td className="px-6 py-2.5 text-slate-700">
                      {row.posisiTerakhir} / 27
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
