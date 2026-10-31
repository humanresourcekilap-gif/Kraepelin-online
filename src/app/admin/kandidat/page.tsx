"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  ArrowRight,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

type CandidateItem = {
  id: string;
  nama: string;
  email: string;
  nomor_hp: string;
  posisi_dilamar: string;
  jenjang_pendidikan: string;
  jurusan: string;
  kelompok_pendidikan: string;
  created_at: string;
  testStatus: "BELUM_MULAI" | "SEDANG_BERLANGSUNG" | "SELESAI";
  sesi: {
    id: string;
    panker: number | null;
    tianker: number | null;
    janker: number | null;
    hanker: number | null;
    hasil_norma: Record<string, { category?: string }> | null;
  } | null;
};

export default function AdminKandidatPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("SEMUA");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modal confirm state
  const [confirmModal, setConfirmModal] = useState<{
    type: "reset" | "delete";
    candidate: CandidateItem;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchCandidates() {
      try {
        setErrorMessage(null);
        const res = await fetch("/api/admin/kandidat");
        if (res.status === 401) {
          if (active) router.replace("/admin/login");
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || `Server error (${res.status})`);
        }
        const data = await res.json();
        if (data.success && active) {
          setCandidates(data.data || []);
        }
      } catch (err) {
        console.error("Gagal memuat kandidat:", err);
        if (active) {
          setErrorMessage(err instanceof Error ? err.message : "Gagal memuat kandidat.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCandidates();
    return () => {
      active = false;
    };
  }, [router]);

  async function reloadCandidates() {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/kandidat");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat ulang kandidat:", err);
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat ulang data kandidat.");
    } finally {
      setRefreshing(false);
    }
  }

  // Filter kandidat aman dari null/undefined
  const filtered = candidates.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (c.nama || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.posisi_dilamar || "").toLowerCase().includes(q) ||
      (c.jurusan || "").toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "SEMUA" || c.testStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  async function handleResetSession() {
    if (!confirmModal || confirmModal.type !== "reset") return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/kandidat/${confirmModal.candidate.id}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Sesi tes ${confirmModal.candidate.nama} berhasil direset.`);
        setConfirmModal(null);
        reloadCandidates();
      } else {
        alert(data.message || "Gagal mereset sesi.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCandidate() {
    if (!confirmModal || confirmModal.type !== "delete") return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/kandidat/${confirmModal.candidate.id}/delete`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice(`Data ${confirmModal.candidate.nama} berhasil dihapus.`);
        setConfirmModal(null);
        reloadCandidates();
      } else {
        alert(data.message || "Gagal menghapus kandidat.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  }

  function copyCandidateTestLink(candidateId: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const testLink = `${origin}/assessment?candidateId=${candidateId}`;
    navigator.clipboard.writeText(testLink);
    setCopiedId(candidateId);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Data & Manajemen Kandidat
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              {candidates.length} Peserta
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Daftar lengkap peserta asesmen, status pengerjaan, dan ringkasan skor Kraepelin
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadCandidates}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-orange-500" : "text-slate-400"} />
            <span>{refreshing ? "Memuat..." : "Segarkan"}</span>
          </button>

          <a
            href="/api/admin/export/csv"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 transition sm:text-sm"
          >
            <Download size={16} />
            Export Spreadsheet (CSV)
          </a>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 sm:text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={reloadCandidates}
            className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-200 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Action Notice */}
      {actionNotice && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 text-xs font-medium text-green-800 sm:text-sm">
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-green-600 hover:text-green-800 text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, email, posisi, atau jurusan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 sm:text-sm"
          />
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:outline-none sm:text-sm"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="SELESAI">Selesai Dikerjakan</option>
            <option value="SEDANG_BERLANGSUNG">Sedang Berlangsung</option>
            <option value="BELUM_MULAI">Belum Mulai</option>
          </select>
        </div>
      </div>

      {/* Table & Cards */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Mobile View: Card List */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                <span>Memuat kandidat...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 px-4">
              Tidak ditemukan data kandidat yang cocok.
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                {/* Header: Nama & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{c.nama}</h3>
                    <p className="text-xs text-slate-500">{c.email}</p>
                    <p className="text-[11px] text-slate-400">{c.nomor_hp}</p>
                  </div>
                  <div>
                    {c.testStatus === "SELESAI" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Selesai
                      </span>
                    ) : c.testStatus === "SEDANG_BERLANGSUNG" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Sedang Tes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Belum Mulai
                      </span>
                    )}
                  </div>
                </div>

                {/* Posisi & Pendidikan */}
                <div className="rounded-xl bg-slate-50 p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Posisi:</span>
                    <strong className="text-slate-800">{c.posisi_dilamar}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Pendidikan:</span>
                    <span className="text-slate-600">{c.jenjang_pendidikan} · {c.jurusan} ({c.kelompok_pendidikan})</span>
                  </div>
                </div>

                {/* Skor jika ada */}
                {c.sesi && c.testStatus === "SELESAI" && (
                  <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-2.5 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                      <span className="text-orange-700">P: {c.sesi.panker}</span>
                      <span className="text-slate-300">|</span>
                      <span>T: {c.sesi.tianker}</span>
                      <span className="text-slate-300">|</span>
                      <span>J: {c.sesi.janker}</span>
                      <span className="text-slate-300">|</span>
                      <span>H: {c.sesi.hanker}</span>
                    </div>
                    {c.sesi.hasil_norma?.panker?.category && (
                      <div className="mt-1.5 pt-1.5 border-t border-orange-200/50 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Kategori Norma:</span>
                        <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                          {c.sesi.hasil_norma.panker.category}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyCandidateTestLink(c.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check size={13} className="text-green-600" />
                          <span className="text-green-600">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Link</span>
                        </>
                      )}
                    </button>

                    {c.sesi && (
                      <button
                        type="button"
                        onClick={() => setConfirmModal({ type: "reset", candidate: c })}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        <RotateCcw size={13} />
                        <span>Reset</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmModal({ type: "delete", candidate: c })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <Link
                    href={`/admin/kandidat/${c.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 transition"
                  >
                    Detail
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Kandidat</th>
                <th className="px-6 py-3.5">Posisi & Latar Belakang</th>
                <th className="px-6 py-3.5">Status Pengerjaan</th>
                <th className="px-6 py-3.5">Skor (PANKER / TIANKER / JANKER / HANKER)</th>
                <th className="px-6 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span>Memuat kandidat...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    Tidak ditemukan data kandidat yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    {/* Kandidat Info */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{c.nama}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                      <p className="text-[11px] text-slate-400">{c.nomor_hp}</p>
                    </td>

                    {/* Posisi & Pendidikan */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{c.posisi_dilamar}</p>
                      <p className="text-xs text-slate-500">
                        {c.jenjang_pendidikan} · {c.jurusan}
                      </p>
                      <span className="inline-block mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {c.kelompok_pendidikan}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {c.testStatus === "SELESAI" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Selesai
                        </span>
                      ) : c.testStatus === "SEDANG_BERLANGSUNG" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Sedang Ujian
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Belum Mulai
                        </span>
                      )}
                    </td>

                    {/* Skor */}
                    <td className="px-6 py-4">
                      {c.sesi && c.testStatus === "SELESAI" ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-orange-700">P: {c.sesi.panker}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-medium text-slate-700">T: {c.sesi.tianker}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-medium text-slate-700">J: {c.sesi.janker}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-medium text-slate-700">H: {c.sesi.hanker}</span>
                          </div>
                          {c.sesi.hasil_norma?.panker?.category && (
                            <span className="inline-block rounded-md bg-orange-100/70 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                              Norma: {c.sesi.hasil_norma.panker.category}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Belum ada skor</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Copy Link Tes */}
                        <button
                          type="button"
                          onClick={() => copyCandidateTestLink(c.id)}
                          title="Salin Tautan Tes Kandidat"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        >
                          {copiedId === c.id ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>

                        {/* Reset Sesi */}
                        {c.sesi && (
                          <button
                            type="button"
                            onClick={() => setConfirmModal({ type: "reset", candidate: c })}
                            title="Reset Sesi Tes Kandidat"
                            className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}

                        {/* Hapus Data */}
                        <button
                          type="button"
                          onClick={() => setConfirmModal({ type: "delete", candidate: c })}
                          title="Hapus Kandidat"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* Detail */}
                        <Link
                          href={`/admin/kandidat/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition"
                        >
                          Detail
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  confirmModal.type === "delete"
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {confirmModal.type === "delete" ? <Trash2 size={20} /> : <RotateCcw size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {confirmModal.type === "delete" ? "Hapus Data Kandidat" : "Reset Sesi Tes"}
                </h3>
                <p className="text-xs text-slate-500">{confirmModal.candidate.nama}</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              {confirmModal.type === "delete"
                ? "Apakah Anda yakin ingin menghapus data kandidat ini? Seluruh riwayat jawaban dan hasil tes akan dihapus permanen dari database."
                : "Reset sesi akan menghapus seluruh jawaban tes yang telah tersimpan untuk kandidat ini, sehingga kandidat dapat memulai kembali tes dari awal."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={
                  confirmModal.type === "delete" ? handleDeleteCandidate : handleResetSession
                }
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm ${
                  confirmModal.type === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
                } disabled:opacity-50`}
              >
                {actionLoading ? "Memproses..." : "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
