import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id: candidateId } = await context.params;

  try {
    // 1. Ambil seluruh sesi assessment
    const { data: sessions } = await supabaseAdmin
      .from("sesi_assessment")
      .select("id")
      .eq("id_kandidat", candidateId);

    const sessionIds = (sessions || []).map((s) => s.id);

    // 2. Hapus hasil, jawaban, dan sesi
    if (sessionIds.length > 0) {
      await supabaseAdmin
        .from("hasil_assessment")
        .delete()
        .in("id_sesi_assessment", sessionIds);

      await supabaseAdmin
        .from("jawaban_assessment")
        .delete()
        .in("id_sesi_assessment", sessionIds);

      await supabaseAdmin
        .from("sesi_assessment")
        .delete()
        .in("id", sessionIds);
    }

    // 3. Hapus data kandidat
    const { error: candidateDeleteError } = await supabaseAdmin
      .from("kandidat")
      .delete()
      .eq("id", candidateId);

    if (candidateDeleteError) {
      console.error("Gagal menghapus kandidat:", candidateDeleteError);
      return NextResponse.json(
        { success: false, message: "Gagal menghapus data kandidat." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data kandidat dan seluruh riwayat pengerjaan berhasil dihapus.",
    });
  } catch (error) {
    console.error("Kesalahan penghapusan kandidat:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
