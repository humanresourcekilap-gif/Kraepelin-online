import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { verifySessionCookie } from "@/lib/server/assessment-session";
import { getTestSettings } from "@/lib/server/admin-settings";

export async function GET(request: NextRequest) {
  try {
    // 1. Validasi cookie HttpOnly.
    const cookie = request.cookies.get("assessment_session")?.value;
    const assessmentId = verifySessionCookie(cookie);

    if (!assessmentId) {
      console.error("[SESSION AUTH FAILED]", {
        cookieExists: Boolean(cookie),
        secretExists: Boolean(process.env.ASSESSMENT_COOKIE_SECRET),
      });

      return NextResponse.json(
        {
          success: false,
          error: "Sesi tidak valid. Silakan mulai kembali.",
        },
        { status: 401 }
      );
    }

    // 2. Ambil sesi dari database.
    const { data: sesi, error } = await supabaseAdmin
      .from("sesi_assessment")
      .select("id, status, dimulai_pada, batas_waktu")
      .eq("id", assessmentId)
      .maybeSingle();

    if (error) {
      console.error("Gagal memeriksa sesi assessment:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal memeriksa sesi tes.",
        },
        { status: 500 }
      );
    }

    if (!sesi) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi tes tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 3. Pastikan sesi masih berlangsung.
    if (sesi.status !== "SEDANG_BERLANGSUNG") {
      return NextResponse.json(
        {
          success: false,
          error: "Sesi tes sudah tidak aktif.",
        },
        { status: 403 }
      );
    }

    // 4. Periksa batas waktu berdasarkan database.
    const deadline = Date.parse(sesi.batas_waktu);

    if (!Number.isFinite(deadline)) {
      return NextResponse.json(
        {
          success: false,
          error: "Waktu tes telah berakhir.",
        },
        { status: 410 }
      );
    }

    // Ambil konfigurasi timer dinamis
    let columnDurationMs = 15000;
    let transitionDurationMs = 1000;
    try {
      const activeSettings = await getTestSettings();
      columnDurationMs = activeSettings.durasiKolomDetik * 1000;
      transitionDurationMs = activeSettings.durasiTransisiDetik * 1000;
    } catch {}

    // Sesi yang telah lewat tetap dikirim dengan flag expired
    if (Date.now() >= deadline) {
      return NextResponse.json(
        {
          success: true,
          expired: true,
          session: {
            assessmentId: sesi.id,
            startedAt: sesi.dimulai_pada,
            deadlineAt: sesi.batas_waktu,
            columnDurationMs,
            transitionDurationMs,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 5. Kirim informasi sesi yang sudah divalidasi.
    return NextResponse.json(
      {
        success: true,
        session: {
          assessmentId: sesi.id,
          startedAt: sesi.dimulai_pada,
          deadlineAt: sesi.batas_waktu,
          columnDurationMs,
          transitionDurationMs,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }

    console.error("Kesalahan pemeriksaan sesi:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan saat memeriksa sesi.",
      },
      { status: 500 }
    );
  }
}
