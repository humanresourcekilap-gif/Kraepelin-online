import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";
import { getTestSettings, saveTestSettings } from "@/lib/server/admin-settings";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getTestSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Gagal mengambil pengaturan:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat pengaturan tes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const durasiKolomDetik = Number(body.durasiKolomDetik);
    const durasiTransisiDetik = Number(body.durasiTransisiDetik);
    const totalKolom = Number(body.totalKolom || 50);
    const namaPengaturan = typeof body.namaPengaturan === "string" ? body.namaPengaturan.trim() : "Kustom";

    if (isNaN(durasiKolomDetik) || durasiKolomDetik < 3 || durasiKolomDetik > 120) {
      return NextResponse.json(
        { success: false, message: "Durasi kolom harus antara 3 hingga 120 detik." },
        { status: 400 }
      );
    }

    if (isNaN(durasiTransisiDetik) || durasiTransisiDetik < 0 || durasiTransisiDetik > 10) {
      return NextResponse.json(
        { success: false, message: "Durasi transisi harus antara 0 hingga 10 detik." },
        { status: 400 }
      );
    }

    const saved = await saveTestSettings({
      namaPengaturan,
      durasiKolomDetik,
      durasiTransisiDetik,
      totalKolom,
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan timer tes berhasil diperbarui.",
      settings: saved,
    });
  } catch (error) {
    console.error("Gagal menyimpan pengaturan:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan pengaturan timer." },
      { status: 500 }
    );
  }
}

