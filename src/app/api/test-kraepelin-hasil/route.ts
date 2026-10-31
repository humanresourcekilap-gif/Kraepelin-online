
import { NextResponse } from "next/server";
import { hitungHasilKraepelin } from "@/lib/server/kraepelin-hasil";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  try {
    const perKolom = Array.from({ length: 50 }, (_, index) => ({
      column: index,
      benar: 10,
      salah: 2,
      kosong: 15,
      terjawab: 12,
      posisiJawabanTerakhir: 12,
      skipDiperhitungkan: 0,
    }));

    const rekap = {
      perKolom,
      totalBenar: 500,
      totalSalah: 100,
      totalKosong: 750,
      totalTerjawab: 600,
      totalSoal: 1350,
    };

    const hasil = hitungHasilKraepelin(rekap, "SMA_IPA");

    return NextResponse.json({
      success: true,
      message: "Integrasi scoring dan norma berhasil.",
      hasil,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menghitung hasil.",
      },
      { status: 500 }
    );
  }
}
