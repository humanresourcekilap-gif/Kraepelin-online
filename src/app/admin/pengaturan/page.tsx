"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Timer,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  BookOpen,
  Info,
  Save,
  RotateCcw,
} from "lucide-react";

type SettingsState = {
  namaPengaturan: string;
  durasiKolomDetik: number;
  durasiTransisiDetik: number;
  totalKolom: number;
  updatedAt?: string;
};

export default function AdminPengaturanTimerPage() {
  const [settings, setSettings] = useState<SettingsState>({
    namaPengaturan: "Standar Kraepelin",
    durasiKolomDetik: 15,
    durasiTransisiDetik: 1,
    totalKolom: 50,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/pengaturan");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            setSettings({
              namaPengaturan: data.settings.namaPengaturan,
              durasiKolomDetik: data.settings.durasiKolomDetik,
              durasiTransisiDetik: data.settings.durasiTransisiDetik,
              totalKolom: data.settings.totalKolom,
              updatedAt: data.settings.updatedAt,
            });
          }
        }
      } catch (err) {
        console.error("Gagal membaca pengaturan timer:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Hitung total durasi dalam detik dan format menit:detik
  const totalSeconds =
    settings.totalKolom * settings.durasiKolomDetik +
    Math.max(0, settings.totalKolom - 1) * settings.durasiTransisiDetik;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSecs = totalSeconds % 60;
  const formattedTotal = `${totalMinutes} menit ${remainingSecs > 0 ? `${remainingSecs} detik` : ""}`;

  function applyPreset(name: string, colSec: number, transSec: number, cols: number = 50) {
    setSettings((prev) => ({
      ...prev,
      namaPengaturan: name,
      durasiKolomDetik: colSec,
      durasiTransisiDetik: transSec,
      totalKolom: cols,
    }));
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/pengaturan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: "error",
          text: data.message || "Gagal menyimpan pengaturan timer.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Pengaturan timer berhasil disimpan! Sesi tes kandidat baru akan langsung menerapkan timer ini.",
      });

      if (data.settings?.updatedAt) {
        setSettings((prev) => ({ ...prev, updatedAt: data.settings.updatedAt }));
      }
    } catch {
      setMessage({
        type: "error",
        text: "Terjadi kesalahan saat menghubungi server.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="text-xs font-medium text-slate-400">Memuat konfigurasi timer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
          <Timer size={16} />
          Konfigurasi Mesin Asesmen
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pengaturan Timer Tes Kraepelin
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Atur durasi per kolom, jeda transisi, dan total kolom ujian yang diterapkan saat kandidat mengerjakan tes.
        </p>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <div>
            <p className="font-semibold">{message.type === "success" ? "Berhasil" : "Perhatian"}</p>
            <p className="mt-0.5 text-xs">{message.text}</p>
          </div>
        </div>
      )}

      {/* Preset Cepat */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Pilihan Preset Cepat
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Preset Standar */}
          <button
            type="button"
            onClick={() => applyPreset("Standar Kraepelin", 15, 1, 50)}
            className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
              settings.durasiKolomDetik === 15 && settings.durasiTransisiDetik === 1 && settings.totalKolom === 50
                ? "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 mb-2.5">
              <Sparkles size={16} />
            </div>
            <p className="font-bold text-slate-900 text-sm">Standar Kraepelin</p>
            <p className="text-xs text-slate-500 mt-1">
              15 detik / kolom · 50 kolom
            </p>
            <span className="mt-3 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Total ~13,3 Menit
            </span>
          </button>

          {/* Preset Testing Cepat */}
          <button
            type="button"
            onClick={() => applyPreset("Testing Cepat", 5, 1, 50)}
            className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
              settings.durasiKolomDetik === 5 && settings.durasiTransisiDetik === 1 && settings.totalKolom === 50
                ? "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 mb-2.5">
              <Zap size={16} />
            </div>
            <p className="font-bold text-slate-900 text-sm">Mode Testing Cepat</p>
            <p className="text-xs text-slate-500 mt-1">
              5 detik / kolom · 50 kolom
            </p>
            <span className="mt-3 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Total ~5 Menit
            </span>
          </button>

          {/* Preset Pelatihan/Santai */}
          <button
            type="button"
            onClick={() => applyPreset("Mode Latihan Santai", 30, 2, 50)}
            className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
              settings.durasiKolomDetik === 30 && settings.durasiTransisiDetik === 2 && settings.totalKolom === 50
                ? "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 mb-2.5">
              <BookOpen size={16} />
            </div>
            <p className="font-bold text-slate-900 text-sm">Pelatihan Santai</p>
            <p className="text-xs text-slate-500 mt-1">
              30 detik / kolom · 50 kolom
            </p>
            <span className="mt-3 inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              Total ~26,6 Menit
            </span>
          </button>
        </div>
      </div>

      {/* Form Kustom */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Kustomisasi Timer & Parameter</h2>

        {/* Nama Pengaturan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Label / Nama Preset
          </label>
          <input
            type="text"
            value={settings.namaPengaturan}
            onChange={(e) => setSettings({ ...settings, namaPengaturan: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
            placeholder="Contoh: Rekrutmen Batch MT 2026"
            required
          />
        </div>

        {/* Durasi Kolom */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Durasi Pengerjaan Per Kolom
            </label>
            <span className="text-sm font-bold text-orange-600">
              {settings.durasiKolomDetik} Detik
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Waktu aktif bagi kandidat untuk menjumlahkan angka di satu kolom (rekomendasi: 15 detik).
          </p>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={settings.durasiKolomDetik}
              onChange={(e) =>
                setSettings({ ...settings, durasiKolomDetik: Number(e.target.value) })
              }
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-orange-500"
            />
            <input
              type="number"
              min="3"
              max="120"
              value={settings.durasiKolomDetik}
              onChange={(e) =>
                setSettings({ ...settings, durasiKolomDetik: Math.max(3, Number(e.target.value)) })
              }
              className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Durasi Transisi */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Durasi Jeda / Transisi Antar Kolom
            </label>
            <span className="text-sm font-bold text-orange-600">
              {settings.durasiTransisiDetik} Detik
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Jeda singkat layar terkunci saat kandidat otomatis dipindahkan ke kolom berikutnya (rekomendasi: 1 detik).
          </p>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={settings.durasiTransisiDetik}
              onChange={(e) =>
                setSettings({ ...settings, durasiTransisiDetik: Number(e.target.value) })
              }
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-orange-500"
            />
            <input
              type="number"
              min="0"
              max="10"
              value={settings.durasiTransisiDetik}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  durasiTransisiDetik: Math.max(0, Number(e.target.value)),
                })
              }
              className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Total Kolom */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Total Kolom Soal
            </label>
            <span className="text-sm font-bold text-orange-600">
              {settings.totalKolom} Kolom
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Standar tes psikometri Kraepelin penuh menggunakan tepat 50 kolom (maksimal 50).
          </p>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={settings.totalKolom}
              onChange={(e) => setSettings({ ...settings, totalKolom: Number(e.target.value) })}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-orange-500"
            />
            <input
              type="number"
              min="5"
              max="50"
              value={settings.totalKolom}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  totalKolom: Math.min(50, Math.max(5, Number(e.target.value))),
                })
              }
              className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-center text-sm font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* Live Estimator Card */}
        <div className="rounded-xl border border-orange-200/60 bg-gradient-to-r from-orange-50/70 to-amber-50/70 p-4">
          <div className="flex items-center gap-2 font-bold text-xs text-orange-800 uppercase tracking-wider">
            <Info size={15} />
            Estimasi Total Waktu Pengerjaan
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formattedTotal}</span>
            <span className="text-xs text-slate-500">
              ({totalSeconds} detik total pengerjaan)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Perhitungan: ({settings.totalKolom} kolom × {settings.durasiKolomDetik} detik) + (
            {settings.totalKolom - 1} transisi × {settings.durasiTransisiDetik} detik).
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => applyPreset("Standar Kraepelin", 15, 1, 50)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RotateCcw size={14} />
            Reset ke Standar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Simpan Pengaturan Timer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

