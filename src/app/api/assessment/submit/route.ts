import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { verifySessionCookie } from "@/lib/server/assessment-session";
import {
  hitungRekapScoring,
  type JawabanKandidat,
} from "@/lib/server/kraepelin-scoring";
import { hitungHasilKraepelin } from "@/lib/server/kraepelin-hasil";
import type { EducationGroup } from "@/lib/server/kraepelin-norma";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VERSI_SCORING = "kraepelin-v1";

type SubmitReason = "MANUAL" | "TIMEOUT";

type SubmitBody = {
  assessmentId?: unknown;
  reason?: unknown;
  answers?: Record<string, string>;
};

type RpcSubmitResult = {
  status: string;
  completed_at: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function tentukanKelompokPendidikan(
  jenjangPendidikan: string,
  kelompokPendidikan: string
): EducationGroup | null {
  if (jenjangPendidikan === "SMA" && kelompokPendidikan === "SAINTEK") {
    return "SMA_IPA";
  }

  if (jenjangPendidikan === "SMA" && kelompokPendidikan === "SOSHUM") {
    return "SMA_IPS";
  }

  if (jenjangPendidikan === "S1" && kelompokPendidikan === "SAINTEK") {
    return "S1_IPA";
  }

  if (jenjangPendidikan === "S1" && kelompokPendidikan === "SOSHUM") {
    return "S1_IPS";
  }

  return null;
}

function isSubmitReason(value: unknown): value is SubmitReason {
  return value === "MANUAL" || value === "TIMEOUT";
}

export async function POST(request: NextRequest) {
  // 1. Validasi body permintaan.
  let body: SubmitBody;

  try {
    body = await request.json();
  } catch {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  const { assessmentId, reason, answers: clientAnswers } = body;

  if (
    typeof assessmentId !== "string" ||
    !UUID_REGEX.test(assessmentId) ||
    !isSubmitReason(reason)
  ) {
    return jsonError("Data pengiriman tes tidak valid.", 400);
  }

  // 2. Verifikasi cookie sesi assessment.
  const sessionCookie = request.cookies.get("assessment_session")?.value;

  const isSessionValid = verifySessionCookie(
    sessionCookie,
    assessmentId
  );

  if (!isSessionValid) {
    console.error("[SUBMIT] Validasi sesi gagal:", {
      cookieExists: Boolean(sessionCookie),
      cookieAssessmentId: sessionCookie?.split(".")[0] ?? null,
      requestAssessmentId: assessmentId,
      secretExists: Boolean(process.env.ASSESSMENT_COOKIE_SECRET),
    });

    return jsonError("Sesi tidak sah. Silakan mulai kembali.", 401);
  }

  try {
    // 3. Periksa sesi dan batas waktu.
    const { data: assessment, error: assessmentError } =
      await supabaseAdmin
        .from("sesi_assessment")
        .select("id, id_kandidat, status, batas_waktu")
        .eq("id", assessmentId)
        .maybeSingle();

    if (assessmentError) {
      console.error("[SUBMIT] Gagal memeriksa sesi:", assessmentError);
      return jsonError("Gagal memeriksa sesi tes.", 500);
    }

    if (!assessment) {
      return jsonError("Sesi tes tidak ditemukan.", 404);
    }

    if (assessment.status !== "SEDANG_BERLANGSUNG") {
      return jsonError("Tes ini sudah selesai atau tidak aktif.", 409);
    }

    if (!assessment.batas_waktu) {
      console.error("[SUBMIT] Batas waktu sesi tidak tersedia.");
      return jsonError("Batas waktu sesi tidak valid.", 500);
    }

    const deadlineAt = Date.parse(assessment.batas_waktu);

    if (!Number.isFinite(deadlineAt)) {
      return jsonError("Batas waktu sesi tidak valid.", 500);
    }

    // Toleransi 5 detik agar skew timer client-server tidak melempar 400
    const deadlinePassed = Date.now() >= deadlineAt - 5_000;

    if (reason === "TIMEOUT" && !deadlinePassed) {
      return jsonError("Waktu tes belum habis.", 400);
    }

    // 4. Ambil data pendidikan kandidat dari database.
    const { data: kandidat, error: kandidatError } =
      await supabaseAdmin
        .from("kandidat")
        .select("id, jenjang_pendidikan, kelompok_pendidikan")
        .eq("id", assessment.id_kandidat)
        .maybeSingle();

    if (kandidatError) {
      console.error("[SUBMIT] Gagal mengambil data kandidat:", kandidatError);
      return jsonError("Gagal mengambil data pendidikan kandidat.", 500);
    }

    if (!kandidat) {
      return jsonError("Data kandidat tidak ditemukan.", 404);
    }

    const educationGroup = tentukanKelompokPendidikan(
      kandidat.jenjang_pendidikan,
      kandidat.kelompok_pendidikan
    );

    if (!educationGroup) {
      return jsonError("Kelompok pendidikan kandidat tidak valid.", 422);
    }

    // 5. Ambil jawaban yang tersimpan di database.
    const { data: savedAnswers, error: answersError } =
      await supabaseAdmin
        .from("jawaban_assessment")
        .select("nomor_kolom, nomor_pasangan, nilai_jawaban")
        .eq("id_sesi_assessment", assessmentId);

    if (answersError) {
      console.error("[SUBMIT] Gagal mengambil jawaban:", answersError);
      return jsonError("Gagal mengambil jawaban tes.", 500);
    }

    // 6. Validasi dan konversi jawaban ke format scoring.
    const answers: JawabanKandidat = {};

    for (const item of savedAnswers ?? []) {
      const column = item.nomor_kolom;
      const pair = item.nomor_pasangan;
      const value = item.nilai_jawaban;

      if (
        Number.isInteger(column) &&
        column >= 1 &&
        column <= 50 &&
        Number.isInteger(pair) &&
        pair >= 1 &&
        pair <= 27 &&
        typeof value === "string" &&
        /^[0-9]$/.test(value)
      ) {
        const answerKey = `${column - 1}-${pair - 1}`;
        answers[answerKey] = value;
      }
    }

    // 6b. Sinkronkan backup jawaban yang dikirimkan client jika ada jawaban yang belum tersimpan di DB
    if (clientAnswers && typeof clientAnswers === "object" && !Array.isArray(clientAnswers)) {
      const recordsToInsert: Array<{
        id_sesi_assessment: string;
        nomor_kolom: number;
        nomor_pasangan: number;
        nilai_jawaban: string;
        diperbarui_pada: string;
      }> = [];

      for (const [key, val] of Object.entries(clientAnswers)) {
        if (typeof val === "string" && /^[0-9]$/.test(val)) {
          const [colStr, pairStr] = key.split("-");
          const col = Number(colStr);
          const pair = Number(pairStr);

          if (
            Number.isInteger(col) &&
            col >= 0 &&
            col < 50 &&
            Number.isInteger(pair) &&
            pair >= 0 &&
            pair < 27
          ) {
            const answerKey = `${col}-${pair}`;
            if (!answers[answerKey]) {
              answers[answerKey] = val;
              recordsToInsert.push({
                id_sesi_assessment: assessmentId,
                nomor_kolom: col + 1,
                nomor_pasangan: pair + 1,
                nilai_jawaban: val,
                diperbarui_pada: new Date().toISOString(),
              });
            }
          }
        }
      }

      if (recordsToInsert.length > 0) {
        console.log(`[SUBMIT] Menyinkronkan ${recordsToInsert.length} jawaban backup ke database...`);
        const { error: batchInsertError } = await supabaseAdmin
          .from("jawaban_assessment")
          .upsert(recordsToInsert, {
            onConflict: "id_sesi_assessment,nomor_kolom,nomor_pasangan",
          });

        if (batchInsertError) {
          console.warn("[SUBMIT] Gagal batch insert backup answers:", batchInsertError);
        }
      }
    }

    if (reason === "MANUAL" && Object.keys(answers).length === 0) {
      return jsonError(
        "Belum ada jawaban yang tersimpan. Kerjakan tes sebelum mengirim.",
        400
      );
    }

    // 7. Hitung indikator dan norma di server.
    let hasil: ReturnType<typeof hitungHasilKraepelin>;

    try {
      const rekap = hitungRekapScoring(answers);

      hasil = hitungHasilKraepelin(
        rekap,
        educationGroup
      );
    } catch (error) {
      console.error("[SUBMIT] Gagal menghitung hasil Kraepelin:", error);

      return jsonError(
        "Perhitungan hasil tes gagal. Hasil belum disimpan.",
        500
      );
    }

    // 8. Simpan hasil dan akhiri sesi melalui satu transaksi RPC.
    const { data: rpcData, error: rpcError } =
      await supabaseAdmin.rpc("submit_kraepelin_assessment", {
        p_assessment_id: assessmentId,
        p_reason: reason,
        p_panker: hasil.indikator.panker.value,
        p_tianker: hasil.indikator.tianker.value,
        p_janker: hasil.indikator.janker.meanAbsoluteDeviation,
        p_hanker: hasil.indikator.hanker.value,
        p_hasil_norma: {
          educationGroup,
          panker: hasil.norma.panker,
          tianker: hasil.norma.tianker,
          janker: hasil.norma.jankerAverageDeviation,
          hanker: hasil.norma.hanker,
        },
        p_versi_scoring: VERSI_SCORING,
      });

    if (rpcError) {
      console.error("[SUBMIT] RPC gagal:", {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
      });

      if (rpcError.code === "P0002") {
        return jsonError("Sesi tes tidak ditemukan.", 404);
      }

      if (rpcError.code === "P0001") {
        return jsonError(
          "Tes ini sudah selesai atau tidak aktif.",
          409
        );
      }

      if (rpcError.code === "22023") {
        return jsonError(
          "Sesi tidak memenuhi ketentuan penyelesaian tes.",
          400
        );
      }

      return jsonError(
        "Gagal menyelesaikan tes. Silakan coba kembali.",
        500
      );
    }

    // 9. Validasi respons RPC.
    const rpcResult = Array.isArray(rpcData)
      ? (rpcData[0] as RpcSubmitResult | undefined)
      : undefined;

    if (
      !rpcResult ||
      rpcResult.status !== "SELESAI" ||
      typeof rpcResult.completed_at !== "string" ||
      !Number.isFinite(Date.parse(rpcResult.completed_at))
    ) {
      console.error("[SUBMIT] Respons RPC tidak valid:", rpcData);

      return jsonError(
        "Respons penyelesaian tes tidak valid.",
        500
      );
    }

    // 10. Berikan respons dan hapus cookie sesi.
    const response = NextResponse.json({
      success: true,
      status: rpcResult.status,
      completedAt: rpcResult.completed_at,
      message: "Tes berhasil diakhiri.",
    });

    response.cookies.set("assessment_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Kesalahan API submit assessment:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
