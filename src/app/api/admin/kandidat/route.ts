import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

type SessionData = {
  id: string;
  id_kandidat: string;
  status: string;
  dimulai_pada: string;
  batas_waktu: string;
  diselesaikan_pada?: string;
  alasan_selesai?: string;
  panker: number | null;
  tianker: number | null;
  janker: number | null;
  hanker: number | null;
  hasil_norma: Record<string, { category?: string }> | null;
  dibuat_pada: string;
};

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim().toLowerCase() || "";
  const filterStatus = searchParams.get("status") || "SEMUA";
  const filterPosisi = searchParams.get("posisi") || "SEMUA";

  try {
    // 1. Ambil data kandidat
    let query = supabaseAdmin
      .from("kandidat")
      .select(`
        id,
        nama,
        email,
        nomor_hp,
        tempat_lahir,
        tanggal_lahir,
        posisi_dilamar,
        jenjang_pendidikan,
        jurusan,
        kelompok_pendidikan,
        dibuat_pada
      `)
      .order("dibuat_pada", { ascending: false });

    if (filterPosisi !== "SEMUA") {
      query = query.eq("posisi_dilamar", filterPosisi);
    }

    const { data: candidates, error: candidateError } = await query;

    if (candidateError) {
      console.error("Gagal mengambil kandidat:", candidateError);
      return NextResponse.json(
        { success: false, message: "Gagal memuat data kandidat: " + candidateError.message },
        { status: 500 }
      );
    }

    // 2. Ambil sesi assessment untuk kandidat-kandidat tersebut
    const candidateIds = (candidates || []).map((c) => c.id);
    const sessionsMap: Record<string, SessionData> = {};

    if (candidateIds.length > 0) {
      const { data: sessions, error: sessionError } = await supabaseAdmin
        .from("sesi_assessment")
        .select(`
          id,
          id_kandidat,
          status,
          dimulai_pada,
          batas_waktu,
          diselesaikan_pada,
          dibuat_pada
        `)
        .in("id_kandidat", candidateIds)
        .order("dibuat_pada", { ascending: false });

      if (sessionError) {
        console.error("Gagal mengambil sesi assessment:", sessionError);
      }

      const sessionIds = (sessions || []).map((s) => s.id);

      // Ambil hasil assessment dari tabel hasil_assessment
      const resultsMap: Record<
        string,
        {
          panker: number | null;
          tianker: number | null;
          janker: number | null;
          hanker: number | null;
          hasil_norma: Record<string, { category?: string }> | null;
        }
      > = {};

      if (sessionIds.length > 0) {
        const { data: results, error: resultsError } = await supabaseAdmin
          .from("hasil_assessment")
          .select("id_sesi_assessment, panker, tianker, janker, hanker, hasil_norma")
          .in("id_sesi_assessment", sessionIds);

        if (!resultsError && results) {
          for (const r of results) {
            resultsMap[r.id_sesi_assessment] = {
              panker: r.panker,
              tianker: r.tianker,
              janker: r.janker,
              hanker: r.hanker,
              hasil_norma: r.hasil_norma,
            };
          }
        }
      }

      if (sessions) {
        for (const s of sessions) {
          if (!sessionsMap[s.id_kandidat]) {
            const res = resultsMap[s.id];
            sessionsMap[s.id_kandidat] = {
              id: s.id,
              id_kandidat: s.id_kandidat,
              status: s.status,
              dimulai_pada: s.dimulai_pada,
              batas_waktu: s.batas_waktu,
              diselesaikan_pada: s.diselesaikan_pada,
              dibuat_pada: s.dibuat_pada,
              panker: res?.panker ?? null,
              tianker: res?.tianker ?? null,
              janker: res?.janker ?? null,
              hanker: res?.hanker ?? null,
              hasil_norma: res?.hasil_norma ?? null,
            };
          }
        }
      }
    }

    // 3. Gabungkan data kandidat dan sesi
    let items = (candidates || []).map((c) => {
      const sess = sessionsMap[c.id];
      let testStatus: "BELUM_MULAI" | "SEDANG_BERLANGSUNG" | "SELESAI" = "BELUM_MULAI";
      if (sess) {
        if (sess.status === "SELESAI") testStatus = "SELESAI";
        else if (sess.status === "SEDANG_BERLANGSUNG") testStatus = "SEDANG_BERLANGSUNG";
      }

      return {
        ...c,
        created_at: c.dibuat_pada, // Alias agar kompatibel dengan frontend
        sesi: sess || null,
        testStatus,
      };
    });

    // 4. Filter berdasarkan status jika ada
    if (filterStatus !== "SEMUA") {
      items = items.filter((item) => item.testStatus === filterStatus);
    }

    // 5. Filter search keyword (nama, email, posisi, jurusan)
    if (search) {
      items = items.filter(
        (item) =>
          (item.nama || "").toLowerCase().includes(search) ||
          (item.email || "").toLowerCase().includes(search) ||
          (item.posisi_dilamar || "").toLowerCase().includes(search) ||
          (item.jurusan || "").toLowerCase().includes(search)
      );
    }

    // 6. Hitung statistik ringkas untuk overview
    const totalKandidat = candidates?.length || 0;
    const totalSelesai = Object.values(sessionsMap).filter((s) => s.status === "SELESAI").length;
    const totalSedangTes = Object.values(sessionsMap).filter((s) => s.status === "SEDANG_BERLANGSUNG").length;

    // Rata-rata PANKER dari yang sudah selesai
    const selesaiSessions = Object.values(sessionsMap).filter((s) => s.status === "SELESAI" && s.panker !== null);
    const avgPanker =
      selesaiSessions.length > 0
        ? Number(
            (
              selesaiSessions.reduce((acc, curr) => acc + Number(curr.panker || 0), 0) /
              selesaiSessions.length
            ).toFixed(2)
          )
        : 0;

    return NextResponse.json({
      success: true,
      data: items,
      stats: {
        totalKandidat,
        totalSelesai,
        totalSedangTes,
        totalBelumMulai: Math.max(0, totalKandidat - totalSelesai - totalSedangTes),
        avgPanker,
      },
    });
  } catch (error) {
    console.error("Gagal di endpoint kandidat:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
