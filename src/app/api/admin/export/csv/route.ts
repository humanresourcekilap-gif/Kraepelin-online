import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

type ResultRecord = {
  id_sesi_assessment: string;
  panker: number | null;
  tianker: number | null;
  janker: number | null;
  hanker: number | null;
  hasil_norma: {
    panker?: { category?: string };
    tianker?: { category?: string };
    janker?: { category?: string };
    hanker?: { category?: string };
  } | null;
};

type SessionRow = {
  id: string;
  id_kandidat: string;
  status: string;
  dibuat_pada: string;
};

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ambil seluruh kandidat
    const { data: candidates, error: candidateError } = await supabaseAdmin
      .from("kandidat")
      .select("*")
      .order("dibuat_pada", { ascending: false });

    if (candidateError) {
      return NextResponse.json({ success: false, message: "Gagal mengambil data kandidat: " + candidateError.message }, { status: 500 });
    }

    // 2. Ambil seluruh sesi assessment
    const { data: sessions } = await supabaseAdmin
      .from("sesi_assessment")
      .select("id, id_kandidat, status, dibuat_pada")
      .order("dibuat_pada", { ascending: false });

    const sessionMap: Record<string, SessionRow> = {};
    for (const s of (sessions || []) as SessionRow[]) {
      if (!sessionMap[s.id_kandidat]) {
        sessionMap[s.id_kandidat] = s;
      }
    }

    // 3. Ambil seluruh hasil assessment
    const { data: results } = await supabaseAdmin
      .from("hasil_assessment")
      .select("id_sesi_assessment, panker, tianker, janker, hanker, hasil_norma");

    const resultMap: Record<string, ResultRecord> = {};
    for (const r of (results || []) as ResultRecord[]) {
      resultMap[r.id_sesi_assessment] = r;
    }

    // 4. Bangun baris CSV
    const headers = [
      "Nama Kandidat",
      "Email",
      "Nomor HP",
      "Posisi Dilamar",
      "Pendidikan",
      "Jurusan",
      "Kelompok Pendidikan",
      "Tanggal Daftar",
      "Status Tes",
      "PANKER (Kecepatan)",
      "Norma PANKER",
      "TIANKER (Ketelitian)",
      "Norma TIANKER",
      "JANKER (Kestabilan)",
      "Norma JANKER",
      "HANKER (Ketahanan)",
      "Norma HANKER",
    ];

    const rows = (candidates || []).map((c) => {
      const sess = sessionMap[c.id];
      const res = sess ? resultMap[sess.id] : null;
      const norma = res?.hasil_norma || {};

      let statusTes = "BELUM MULAI";
      if (sess?.status === "SELESAI") statusTes = "SELESAI";
      else if (sess?.status === "SEDANG_BERLANGSUNG") statusTes = "SEDANG TES";

      const tanggalDaftar = c.dibuat_pada
        ? new Date(c.dibuat_pada).toLocaleDateString("id-ID")
        : "-";

      return [
        escapeCsvField(c.nama),
        escapeCsvField(c.email),
        escapeCsvField(c.nomor_hp),
        escapeCsvField(c.posisi_dilamar),
        escapeCsvField(c.jenjang_pendidikan),
        escapeCsvField(c.jurusan),
        escapeCsvField(c.kelompok_pendidikan),
        escapeCsvField(tanggalDaftar),
        escapeCsvField(statusTes),
        escapeCsvField(res?.panker ?? "-"),
        escapeCsvField(norma.panker?.category ?? "-"),
        escapeCsvField(res?.tianker ?? "-"),
        escapeCsvField(norma.tianker?.category ?? "-"),
        escapeCsvField(res?.janker ?? "-"),
        escapeCsvField(norma.janker?.category ?? (norma as Record<string, { category?: string }>).jankerAverageDeviation?.category ?? "-"),
        escapeCsvField(res?.hanker ?? "-"),
        escapeCsvField(norma.hanker?.category ?? "-"),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const filename = `rekap-kraepelin-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Gagal export CSV:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan export CSV." },
      { status: 500 }
    );
  }
}
