import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import {
  COOKIE_GRACE_MS,
  signSession,
  getAssessmentSecret,
} from "@/lib/server/assessment-session";
import { getTestSettings } from "@/lib/server/admin-settings";

// ============================================
// VALIDASI ID KANDIDAT
// ============================================

function isValidUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

// ============================================
// POST /api/assessment/start
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Ambil secret untuk penandatanganan cookie sesi (dengan fallback aman)
    const secret = getAssessmentSecret();

    // 2. Baca request body.
    let body: { candidateId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format permintaan tidak valid.",
        },
        { status: 400 }
      );
    }

    const candidateId = body.candidateId;

    // 3. Validasi ID kandidat.
    if (!isValidUUID(candidateId)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID kandidat tidak valid.",
        },
        { status: 400 }
      );
    }

    // 4. Pastikan kandidat terdaftar.
    const { data: kandidat, error: kandidatError } = await supabaseAdmin
      .from("kandidat")
      .select("id")
      .eq("id", candidateId)
      .maybeSingle();

    if (kandidatError) {
      console.error("Gagal memeriksa kandidat:", kandidatError);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal memeriksa data kandidat.",
        },
        { status: 500 }
      );
    }

    if (!kandidat) {
      return NextResponse.json(
        {
          success: false,
          message: "Data kandidat tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 5. Periksa sesi assessment sebelumnya.
    const isAssessmentTestMode =
      process.env.NODE_ENV !== "production" ||
      process.env.ASSESSMENT_TEST_MODE === "true";

    // 5a. Sesi yang belum dimulai atau masih berlangsung.
    const { data: sesiAktif, error: sesiAktifError } =
      await supabaseAdmin
        .from("sesi_assessment")
        .select(
          "id, status, dimulai_pada, batas_waktu, durasi_kolom_detik, durasi_transisi_detik"
        )
        .eq("id_kandidat", candidateId)
        .in("status", ["BELUM_DIMULAI", "SEDANG_BERLANGSUNG"])
        .order("dimulai_pada", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (sesiAktifError) {
      console.error(
        "Gagal memeriksa sesi assessment aktif:",
        sesiAktifError
      );

      return NextResponse.json(
        {
          success: false,
          message: "Gagal memeriksa sesi assessment sebelumnya.",
        },
        { status: 500 }
      );
    }

    if (sesiAktif) {
      const deadline = Date.parse(sesiAktif.batas_waktu);
      const isExpired = Number.isFinite(deadline) ? Date.now() >= deadline : true;

      if (!isExpired) {
        // Sesi masih aktif dan belum habis waktu -> pulihkan sesi untuk kandidat (resumed)
        const testSettings = await getTestSettings();
        const columnDurationMs =
          (sesiAktif.durasi_kolom_detik ?? testSettings.durasiKolomDetik) * 1000;
        const transitionDurationMs =
          (sesiAktif.durasi_transisi_detik ?? testSettings.durasiTransisiDetik) * 1000;
        const totalColumns = testSettings.totalKolom || 50;

        const signature = signSession(sesiAktif.id, secret);

        const response = NextResponse.json(
          {
            success: true,
            resumed: true,
            assessmentId: sesiAktif.id,
            startedAt: sesiAktif.dimulai_pada,
            deadlineAt: sesiAktif.batas_waktu,
            status: sesiAktif.status,
            columnDurationMs,
            transitionDurationMs,
            totalColumns,
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );

        response.cookies.set(
          "assessment_session",
          `${sesiAktif.id}.${signature}`,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            expires: new Date(deadline + COOKIE_GRACE_MS),
          }
        );

        return response;
      } else {
        // Sesi sudah lewat batas waktu (kadaluarsa).
        // Tutup sesi menggantung ini menjadi SELESAI di database.
        await supabaseAdmin
          .from("sesi_assessment")
          .update({
            status: "SELESAI",
            diselesaikan_pada: sesiAktif.batas_waktu,
            diperbarui_pada: new Date().toISOString(),
          })
          .eq("id", sesiAktif.id);

        if (!isAssessmentTestMode) {
          return NextResponse.json(
            {
              success: false,
              code: "ASSESSMENT_SESSION_EXISTS",
              message:
                "Waktu assessment Anda telah berakhir. Hubungi HR jika diperlukan pengulangan tes.",
            },
            { status: 409 }
          );
        }
      }
    }

    // 5b. Di luar mode testing, kandidat yang sudah selesai tidak boleh mengulang tanpa reset dari admin.
    if (!isAssessmentTestMode) {
      const { data: sesiSelesai, error: sesiSelesaiError } =
        await supabaseAdmin
          .from("sesi_assessment")
          .select("id")
          .eq("id_kandidat", candidateId)
          .eq("status", "SELESAI")
          .limit(1)
          .maybeSingle();

      if (sesiSelesaiError) {
        console.error(
          "Gagal memeriksa riwayat assessment:",
          sesiSelesaiError
        );

        return NextResponse.json(
          {
            success: false,
            message: "Gagal memeriksa riwayat assessment sebelumnya.",
          },
          { status: 500 }
        );
      }

      if (sesiSelesai) {
        return NextResponse.json(
          {
            success: false,
            code: "ASSESSMENT_SESSION_EXISTS",
            message:
              "Kandidat sudah menyelesaikan assessment. Hubungi HR jika diperlukan pengulangan tes.",
          },
          { status: 409 }
        );
      }
    }

    // 6. Ambil pengaturan durasi tes aktif (dinamis dari admin dashboard)
    const testSettings = await getTestSettings();
    const columnDurationMs = testSettings.durasiKolomDetik * 1000;
    const transitionDurationMs = testSettings.durasiTransisiDetik * 1000;
    const totalColumns = testSettings.totalKolom || 50;

    const totalDurationMs =
      totalColumns * columnDurationMs +
      (totalColumns - 1) * transitionDurationMs;

    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + totalDurationMs);

    // 7. Buat sesi assessment di database (dengan snapshot durasi).
    let sesiBaru: { id: string; dimulai_pada: string; batas_waktu: string; status: string } | null = null;

    // Coba simpan dengan kolom durasi jika ada di schema
    const insertAttempt = await supabaseAdmin
      .from("sesi_assessment")
      .insert({
        id_kandidat: candidateId,
        status: "SEDANG_BERLANGSUNG",
        dimulai_pada: startedAt.toISOString(),
        batas_waktu: deadlineAt.toISOString(),
        durasi_kolom_detik: testSettings.durasiKolomDetik,
        durasi_transisi_detik: testSettings.durasiTransisiDetik,
      })
      .select("id, dimulai_pada, batas_waktu, status")
      .maybeSingle();

    if (insertAttempt.error) {
      // Jika kolom durasi_kolom_detik belum ada di database, fallback simpan tanpa kolom tersebut
      const fallbackInsert = await supabaseAdmin
        .from("sesi_assessment")
        .insert({
          id_kandidat: candidateId,
          status: "SEDANG_BERLANGSUNG",
          dimulai_pada: startedAt.toISOString(),
          batas_waktu: deadlineAt.toISOString(),
        })
        .select("id, dimulai_pada, batas_waktu, status")
        .single();

      if (fallbackInsert.error || !fallbackInsert.data) {
        console.error("Gagal membuat sesi assessment (fallback):", fallbackInsert.error);
        return NextResponse.json(
          {
            success: false,
            message: "Gagal memulai assessment. Silakan coba kembali.",
          },
          { status: 500 }
        );
      }
      sesiBaru = fallbackInsert.data;
    } else {
      sesiBaru = insertAttempt.data;
    }

    if (!sesiBaru) {
      return NextResponse.json(
        {
          success: false,
          message: "Gagal membuat data sesi assessment.",
        },
        { status: 500 }
      );
    }

    // 8. Siapkan respons dan tanda tangan sesi.
    const signature = signSession(sesiBaru.id, secret);

    const response = NextResponse.json(
      {
        success: true,
        assessmentId: sesiBaru.id,
        startedAt: sesiBaru.dimulai_pada,
        deadlineAt: sesiBaru.batas_waktu,
        status: sesiBaru.status,
        columnDurationMs,
        transitionDurationMs,
        totalColumns,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    // 9. Simpan cookie sesi.
    response.cookies.set(
      "assessment_session",
      `${sesiBaru.id}.${signature}`,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(deadlineAt.getTime() + COOKIE_GRACE_MS),
      }
    );

    return response;
  } catch (error) {
    console.error("Kesalahan API start assessment:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
