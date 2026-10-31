import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id: candidateId } = await context.params;

  try {
    // 1. Ambil seluruh sesi assessment milik kandidat ini
    const { data: sessions, error: findError } = await supabaseAdmin
      .from("sesi_assessment")
      .select("id")
      .eq("id_kandidat", candidateId);

    if (findError) {
      console.error("Gagal mencari sesi kandidat:", findError);
      return NextResponse.json(
        { success: false, message: "Gagal memeriksa sesi kandidat." },
        { status: 500 }
      );
    }

    const sessionIds = (sessions || []).map((s) => s.id);

    // 2. Hapus jawaban dan hasil assessment terlebih dahulu
    if (sessionIds.length > 0) {
      await supabaseAdmin
        .from("hasil_assessment")
        .delete()
        .in("id_sesi_assessment", sessionIds);

      await supabaseAdmin
        .from("jawaban_assessment")
        .delete()
        .in("id_sesi_assessment", sessionIds);

      // 3. Hapus seluruh rekaman sesi agar kandidat dapat mengulang tes dari awal
      const { error: deleteError } = await supabaseAdmin
        .from("sesi_assessment")
        .delete()
        .in("id", sessionIds);

      if (deleteError) {
        console.error("Gagal mereset sesi assessment:", deleteError);
        return NextResponse.json(
          { success: false, message: "Gagal menghapus riwayat sesi tes." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sesi tes kandidat berhasil direset. Kandidat kini dapat memulai tes kembali.",
    });
  } catch (error) {
    console.error("Kesalahan reset sesi:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
