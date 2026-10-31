
import { NextResponse } from "next/server";
import {
  hitungSkorKolom,
  type JawabanKandidat,
} from "@/lib/server/kraepelin-scoring";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  // Skenario A: pasangan 1–10 dan 15 terisi.
  const jawabanA: JawabanKandidat = {};

  for (let pair = 0; pair < 10; pair++) {
    jawabanA[`0-${pair}`] = 0;
  }

  jawabanA["0-14"] = 0;

  const skenarioA = hitungSkorKolom(0, jawabanA);

  // Skenario A diharapkan mengikuti semantik scoring saat ini:
  // "kosong" hanya dihitung dalam rentang pasangan 1 sampai
  // posisi jawaban terakhir (kelas skip yang memengaruhi TIANKER).
  const skenarioEkspektasiA = {
    posisiJawabanTerakhir: 15,
    terjawab: 11,
    skipDiperhitungkan: 4, // pasangan 11–14 kosong dalam rentang
    kosong: 4,
  };

  // Skenario B: kolom sama sekali kosong.
  const skenarioB = hitungSkorKolom(0, {});

  // Skenario C: pasangan 1–10 terisi tanpa celah.
  const jawabanC: JawabanKandidat = {};

  for (let pair = 0; pair < 10; pair++) {
    jawabanC[`0-${pair}`] = 0;
  }

  const skenarioC = hitungSkorKolom(0, jawabanC);

  const hasilPengujian = {
    skenarioA: {
      hasil: skenarioA,
      lulus:
        skenarioA.posisiJawabanTerakhir ===
          skenarioEkspektasiA.posisiJawabanTerakhir &&
        skenarioA.terjawab === skenarioEkspektasiA.terjawab &&
        skenarioA.skipDiperhitungkan ===
          skenarioEkspektasiA.skipDiperhitungkan &&
        skenarioA.kosong === skenarioEkspektasiA.kosong,
    },
    skenarioB: {
      hasil: skenarioB,
      lulus:
        skenarioB.posisiJawabanTerakhir === 0 &&
        skenarioB.terjawab === 0 &&
        skenarioB.skipDiperhitungkan === 0 &&
        skenarioB.kosong === 0,
    },
    skenarioC: {
      hasil: skenarioC,
      lulus:
        skenarioC.posisiJawabanTerakhir === 10 &&
        skenarioC.terjawab === 10 &&
        skenarioC.skipDiperhitungkan === 0 &&
        skenarioC.kosong === 0,
    },
  };

  const semuaLulus = Object.values(hasilPengujian).every(
    (skenario) => skenario.lulus
  );

  return NextResponse.json({
    status: semuaLulus ? "SEMUA LULUS" : "ADA PENGUJIAN GAGAL",
    semuaLulus,
    pengujian: hasilPengujian,
  });
}
