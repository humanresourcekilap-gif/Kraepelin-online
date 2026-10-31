
import { NextResponse } from "next/server";
import {
  calculateKraepelin,
  type KraepelinColumnInput,
} from "@/lib/server/kraepelin";

function buatDataKolom(
  pola: "naik" | "turun" | "bervariasi"
): KraepelinColumnInput[] {
  return Array.from({ length: 50 }, (_, index) => {
    let correct: number;

    if (pola === "naik") {
      correct = 2 + Math.floor(index / 5);
    } else if (pola === "turun") {
      correct = 11 - Math.floor(index / 5);
    } else {
      correct = [4, 8, 5, 10, 6][index % 5];
    }

    const error = 0;
    const lastAnsweredPair = correct;
    const skipped = 0;

    return {
      column: index + 1,
      correct,
      error,
      lastAnsweredPair,
      skipped,
    };
  });
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  try {
    const naik = calculateKraepelin(buatDataKolom("naik"));
    const turun = calculateKraepelin(buatDataKolom("turun"));
    const bervariasi = calculateKraepelin(
      buatDataKolom("bervariasi")
    );

    const pengujian = {
      naik: {
        panker: naik.panker.value,
        janker: naik.janker.meanAbsoluteDeviation,
        hanker: naik.hanker.value,
        lulus: naik.hanker.value > 0,
      },
      turun: {
        panker: turun.panker.value,
        janker: turun.janker.meanAbsoluteDeviation,
        hanker: turun.hanker.value,
        lulus: turun.hanker.value < 0,
      },
      bervariasi: {
        panker: bervariasi.panker.value,
        janker: bervariasi.janker.meanAbsoluteDeviation,
        hanker: bervariasi.hanker.value,
        lulus: bervariasi.janker.meanAbsoluteDeviation > 0,
      },
    };

    const semuaLulus = Object.values(pengujian).every(
      (skenario) => skenario.lulus
    );

    return NextResponse.json({
      status: semuaLulus ? "SEMUA LULUS" : "ADA PENGUJIAN GAGAL",
      semuaLulus,
      pengujian,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menguji indikator.",
      },
      { status: 500 }
    );
  }
}
