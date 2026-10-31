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
      return NextResponse.json(
        {
          success: false,
          session: null,
          error: "Belum ada sesi aktif.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 2. Ambil sesi dari database.
    const { data: sesi, error } = await supabaseAdmin
      .from("sesi_assessment")
      .select("id, status, dimulai_pada, batas_waktu, durasi_kolom_detik, durasi_transisi_detik")
      .eq("id", assessmentId)
      .maybeSingle();

    if (error) {
      console.error("Gagal memeriksa sesi assessment:", error);

      return NextResponse.json(
        {
          success: false,
          session: null,
          error: "Gagal memeriksa sesi tes.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!sesi) {
      return NextResponse.json(
        {
          success: false,
          session: null,
          error: "Sesi tes tidak ditemukan.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 3. Pastikan sesi masih berlangsung.
    if (sesi.status !== "SEDANG_BERLANGSUNG") {
      return NextResponse.json(
        {
          success: false,
          session: null,
          error: "Sesi tes sudah tidak aktif.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 4. Periksa batas waktu berdasarkan database.
    const deadline = Date.parse(sesi.batas_waktu);

    if (!Number.isFinite(deadline)) {
      return NextResponse.json(
        {
          success: false,
          session: null,
          error: "Waktu tes telah berakhir.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Ambil konfigurasi timer dinamis (snapshot dari sesi jika ada)
    let columnDurationMs = 15000;
    let transitionDurationMs = 1000;
    try {
      if (sesi.durasi_kolom_detik && sesi.durasi_transisi_detik) {
        columnDurationMs = sesi.durasi_kolom_detik * 1000;
        transitionDurationMs = sesi.durasi_transisi_detik * 1000;
      } else {
        const activeSettings = await getTestSettings();
        columnDurationMs = activeSettings.durasiKolomDetik * 1000;
        transitionDurationMs = activeSettings.durasiTransisiDetik * 1000;
      }
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
