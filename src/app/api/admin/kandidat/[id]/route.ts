import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { hitungRekapScoring, type JawabanKandidat } from "@/lib/server/kraepelin-scoring";

type ColumnBreakdownItem = {
  kolom: number;
  benar: number;
  salah: number;
  kosong: number;
  terjawab: number;
  posisiTerakhir: number;
  skipDiperhitungkan: number;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id: candidateId } = await context.params;

  try {
    // 1. Ambil data kandidat
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("kandidat")
      .select("*")
      .eq("id", candidateId)
      .maybeSingle();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { success: false, message: "Data kandidat tidak ditemukan." },
        { status: 404 }
      );
    }

    // 2. Ambil sesi assessment terbaru
    const { data: assessmentSession, error: sessionError } = await supabaseAdmin
      .from("sesi_assessment")
      .select("*")
      .eq("id_kandidat", candidateId)
      .order("dibuat_pada", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error("Gagal mengambil sesi:", sessionError);
    }

    // Ambil hasil assessment jika ada
    let hasilData = null;
    if (assessmentSession) {
      const { data: hasil, error: hasilError } = await supabaseAdmin
        .from("hasil_assessment")
        .select("panker, tianker, janker, hanker, hasil_norma, versi_scoring")
        .eq("id_sesi_assessment", assessmentSession.id)
        .maybeSingle();

      if (!hasilError && hasil) {
        hasilData = hasil;
      }
    }

    // 3. Jika ada sesi, ambil jawaban dan hitung rincian per kolom
    let breakdownPerKolom: ColumnBreakdownItem[] = [];
    if (assessmentSession) {
      const { data: rawAnswers } = await supabaseAdmin
        .from("jawaban_assessment")
        .select("nomor_kolom, nomor_pasangan, nilai_jawaban")
        .eq("id_sesi_assessment", assessmentSession.id);

      if (rawAnswers && rawAnswers.length > 0) {
        const answers: JawabanKandidat = {};
        for (const item of rawAnswers) {
          const colIdx = item.nomor_kolom - 1;
          const pairIdx = item.nomor_pasangan - 1;
          answers[`${colIdx}-${pairIdx}`] = item.nilai_jawaban;
        }

        try {
          const rekap = hitungRekapScoring(answers);
          breakdownPerKolom = rekap.perKolom.map((col) => ({
            kolom: col.column + 1,
            benar: col.benar,
            salah: col.salah,
            kosong: col.kosong,
            terjawab: col.terjawab,
            posisiTerakhir: col.posisiJawabanTerakhir,
            skipDiperhitungkan: col.skipDiperhitungkan,
          }));
        } catch (scoringError) {
          console.warn("Gagal menghitung rekap kolom:", scoringError);
        }
      }
    }

    const sesiResponse = assessmentSession
      ? {
          ...assessmentSession,
          panker: hasilData?.panker ?? null,
          tianker: hasilData?.tianker ?? null,
          janker: hasilData?.janker ?? null,
          hanker: hasilData?.hanker ?? null,
          hasil_norma: hasilData?.hasil_norma ?? null,
          selesai_pada: assessmentSession.diselesaikan_pada ?? null,
        }
      : null;

    return NextResponse.json({
      success: true,
      candidate: {
        ...candidate,
        created_at: candidate.dibuat_pada, // Alias agar kompatibel
      },
      sesi: sesiResponse,
      breakdownPerKolom,
    });
  } catch (error) {
    console.error("Gagal di endpoint detail kandidat:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
