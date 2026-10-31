import "server-only";

import { supabaseAdmin } from "./supabase-admin";

export type TestSettings = {
  id?: string;
  namaPengaturan: string;
  durasiKolomDetik: number;
  durasiTransisiDetik: number;
  totalKolom: number;
  updatedAt?: string;
};

export const DEFAULT_TEST_SETTINGS: TestSettings = {
  namaPengaturan: "Standar Kraepelin",
  durasiKolomDetik: 15,
  durasiTransisiDetik: 1,
  totalKolom: 50,
};

/**
 * Mengambil pengaturan tes aktif dari Supabase.
 * Jika tabel belum ada atau kosong, fallback ke konfigurasi standar aman (15s & 1s).
 */
export async function getTestSettings(): Promise<TestSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from("pengaturan_tes")
      .select("id, nama_pengaturan, durasi_kolom_detik, durasi_transisi_detik, total_kolom, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_TEST_SETTINGS;
    }

    return {
      id: data.id,
      namaPengaturan: data.nama_pengaturan || DEFAULT_TEST_SETTINGS.namaPengaturan,
      durasiKolomDetik: Math.max(3, Number(data.durasi_kolom_detik) || DEFAULT_TEST_SETTINGS.durasiKolomDetik),
      durasiTransisiDetik: Math.max(0, Number(data.durasi_transisi_detik) ?? DEFAULT_TEST_SETTINGS.durasiTransisiDetik),
      totalKolom: Math.min(50, Math.max(5, Number(data.total_kolom) || DEFAULT_TEST_SETTINGS.totalKolom)),
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Gagal membaca pengaturan_tes dari Supabase, menggunakan default:", err);
    return DEFAULT_TEST_SETTINGS;
  }
}

/**
 * Menyimpan pengaturan tes baru / memperbarui yang aktif.
 */
export async function saveTestSettings(
  params: Partial<TestSettings>
): Promise<TestSettings> {
  const durasiKolomDetik = Math.max(3, Math.min(120, Number(params.durasiKolomDetik) || 15));
  const durasiTransisiDetik = Math.max(0, Math.min(10, Number(params.durasiTransisiDetik) ?? 1));
  const totalKolom = Math.min(50, Math.max(5, Number(params.totalKolom) || 50));
  const namaPengaturan = params.namaPengaturan?.trim() || "Kustom Kraepelin";

  try {
    // Nonaktifkan pengaturan lama
    await supabaseAdmin
      .from("pengaturan_tes")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Masukkan pengaturan baru yang aktif
    const { data, error } = await supabaseAdmin
      .from("pengaturan_tes")
      .insert({
        nama_pengaturan: namaPengaturan,
        durasi_kolom_detik: durasiKolomDetik,
        durasi_transisi_detik: durasiTransisiDetik,
        total_kolom: totalKolom,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id, nama_pengaturan, durasi_kolom_detik, durasi_transisi_detik, total_kolom, updated_at")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Gagal menyimpan ke tabel pengaturan_tes.");
    }

    return {
      id: data.id,
      namaPengaturan: data.nama_pengaturan,
      durasiKolomDetik: data.durasi_kolom_detik,
      durasiTransisiDetik: data.durasi_transisi_detik,
      totalKolom: data.total_kolom,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error("Gagal menyimpan pengaturan tes:", err);
    throw err;
  }
}

