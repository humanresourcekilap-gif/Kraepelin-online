import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import {
  ANSWERS_PER_COLUMN,
  TOTAL_COLUMNS,
  verifySessionCookie,
} from "@/lib/server/assessment-session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAssessment(assessmentId: string) {
  return supabaseAdmin
    .from("sesi_assessment")
    .select("id, status, dimulai_pada, batas_waktu, durasi_kolom_detik, durasi_transisi_detik")
    .eq("id", assessmentId)
    .maybeSingle();
}

// Memuat jawaban yang telah tersimpan.
export async function GET(request: NextRequest) {
  const assessmentId = request.nextUrl.searchParams.get("assessmentId");

  if (!assessmentId || !UUID_REGEX.test(assessmentId)) {
    return jsonError("ID sesi tes tidak valid.", 400);
  }

  // Verifikasi cookie sebelum mengakses data sesi.
  const sessionCookie = request.cookies.get("assessment_session")?.value;

  if (!verifySessionCookie(sessionCookie, assessmentId)) {
    return jsonError("Sesi tidak sah. Silakan mulai kembali.", 401);
  }

  const { data: assessment, error: assessmentError } =
    await getAssessment(assessmentId);

  if (assessmentError) {
    console.error("Gagal memeriksa sesi tes:", assessmentError);
    return jsonError("Gagal memeriksa sesi tes.", 500);
  }

  if (!assessment) {
    return jsonError("Sesi tes tidak ditemukan.", 404);
  }

  if (assessment.status !== "SEDANG_BERLANGSUNG") {
    return jsonError("Sesi tes ini sudah tidak aktif.", 409);
  }

  const deadlineAt = Date.parse(assessment.batas_waktu);

  if (!Number.isFinite(deadlineAt)) {
    return jsonError("Batas waktu sesi tidak valid.", 500);
  }

  if (Date.now() >= deadlineAt + 5_000) {
    return jsonError("Waktu tes telah habis.", 410);
  }

  const { data, error } = await supabaseAdmin
    .from("jawaban_assessment")
    .select("nomor_kolom, nomor_pasangan, nilai_jawaban")
    .eq("id_sesi_assessment", assessmentId)
    .order("nomor_kolom", { ascending: true })
    .order("nomor_pasangan", { ascending: true });

  if (error) {
    console.error("Gagal memuat jawaban:", error);
    return jsonError("Gagal memuat jawaban dari server.", 500);
  }

  return NextResponse.json({
    answers: (data ?? []).map((item) => ({
      columnNumber: item.nomor_kolom,
      pairNumber: item.nomor_pasangan,
      answerValue: String(item.nilai_jawaban),
    })),
  });
}

// Menyimpan satu jawaban secara real-time.
export async function POST(request: NextRequest) {
  let body: {
    assessmentId?: string;
    columnNumber?: number;
    pairNumber?: number;
    answerValue?: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Format permintaan tidak valid.", 400);
  }

  const { assessmentId, columnNumber, pairNumber, answerValue } = body;

  if (
    typeof assessmentId !== "string" ||
    !UUID_REGEX.test(assessmentId)
  ) {
    return jsonError("ID sesi tes tidak valid.", 400);
  }

  // Verifikasi cookie sebelum mengakses data sesi.
  const sessionCookie = request.cookies.get("assessment_session")?.value;

  if (!verifySessionCookie(sessionCookie, assessmentId)) {
    return jsonError("Sesi tidak sah. Silakan mulai kembali.", 401);
  }

  if (
    typeof columnNumber !== "number" ||
    !Number.isInteger(columnNumber) ||
    columnNumber < 1 ||
    columnNumber > TOTAL_COLUMNS ||
    typeof pairNumber !== "number" ||
    !Number.isInteger(pairNumber) ||
    pairNumber < 1 ||
    pairNumber > ANSWERS_PER_COLUMN ||
    typeof answerValue !== "string" ||
    !/^[0-9]$/.test(answerValue)
  ) {
    return jsonError("Data jawaban tidak valid.", 400);
  }

  const { data: assessment, error: assessmentError } =
    await getAssessment(assessmentId);

  if (assessmentError) {
    console.error("Gagal memeriksa sesi tes:", assessmentError);
    return jsonError("Gagal memeriksa sesi tes.", 500);
  }

  if (!assessment) {
    return jsonError("Sesi tes tidak ditemukan.", 404);
  }

  if (assessment.status !== "SEDANG_BERLANGSUNG") {
    return jsonError("Sesi tes sudah selesai atau tidak aktif.", 409);
  }

  const now = Date.now();
  const startedAt = Date.parse(assessment.dimulai_pada);
  const deadlineAt = Date.parse(assessment.batas_waktu);

  if (!Number.isFinite(startedAt) || !Number.isFinite(deadlineAt)) {
    return jsonError(
      "Waktu mulai atau batas waktu sesi tidak valid.",
      500
    );
  }

  // Berikan grace period 15 detik setelah deadline sesi untuk memastikan jawaban akhir tersimpan
  if (now >= deadlineAt + 15_000) {
    return jsonError("Waktu tes telah habis.", 410);
  }

  // Ambil durasi kolom dan transisi dinamis dari sesi assessment
  const colDurationMs = (assessment.durasi_kolom_detik ?? 15) * 1000;
  const transDurationMs = (assessment.durasi_transisi_detik ?? 1) * 1000;
  const cycleMs = colDurationMs + transDurationMs;

  const elapsedMs = Math.max(0, now - startedAt);
  const currentColumnIndex = Math.floor(elapsedMs / cycleMs);
  const serverCalculatedColumn = Math.min(TOTAL_COLUMNS, currentColumnIndex + 1);

  // Toleransi kolom: perkenankan jawaban selama nomor kolom valid dan dalam rentang wajar (+/- 3 kolom dari server)
  // Ini mencegah jawaban hilang jika ada perbedaan waktu browser atau latensi jaringan.
  if (Math.abs(columnNumber - serverCalculatedColumn) > 4 && now < deadlineAt) {
    console.warn(
      `[ANSWERS WARN] Kolom ${columnNumber} berbeda dari estimasi server ${serverCalculatedColumn}`
    );
  }

  const { error: saveError } = await supabaseAdmin
    .from("jawaban_assessment")
    .upsert(
      {
        id_sesi_assessment: assessmentId,
        nomor_kolom: columnNumber,
        nomor_pasangan: pairNumber,
        nilai_jawaban: answerValue,
        diperbarui_pada: new Date().toISOString(),
      },
      {
        onConflict: "id_sesi_assessment,nomor_kolom,nomor_pasangan",
      }
    );

  if (saveError) {
    console.error("Gagal menyimpan jawaban:", saveError);
    return jsonError("Jawaban gagal disimpan ke database.", 500);
  }

  return NextResponse.json({ success: true });
}
