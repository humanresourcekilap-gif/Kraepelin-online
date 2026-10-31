import "server-only";

import { TOTAL_COLUMNS } from "@/app/tes/data-soal";
import { KUNCI_JAWABAN } from "./kunci-jawaban";

export type JawabanKandidat = Record<
  string,
  string | number | null
>;

export type HasilKolom = {
  column: number;
  benar: number;
  salah: number;
  kosong: number;
  terjawab: number;
  posisiJawabanTerakhir: number;
  skipDiperhitungkan: number;
};

export type RekapScoring = {
  perKolom: HasilKolom[];
  totalBenar: number;
  totalSalah: number;
  totalKosong: number;
  totalTerjawab: number;
  totalSoal: number;
};

export function hitungSkorKolom(
  column: number,
  answers: JawabanKandidat
): HasilKolom {
  const kunci = KUNCI_JAWABAN[column];

  if (!kunci) {
    throw new Error(
      `Kunci kolom ${column + 1} tidak ditemukan.`
    );
  }

  let benar = 0;
  let salah = 0;
  let kosong = 0;
  let posisiJawabanTerakhir = 0;

  // Cari posisi jawaban terakhir yang benar-benar diisi.
  for (let pair = 0; pair < kunci.length; pair++) {
    const value = answers[`${column}-${pair}`];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      posisiJawabanTerakhir = pair + 1;
    }
  }

  // Hitung hanya pasangan pertama sampai posisi jawaban terakhir.
  // Pasangan setelah posisi terakhir tidak diperhitungkan.
  for (let pair = 0; pair < posisiJawabanTerakhir; pair++) {
    const value = answers[`${column}-${pair}`];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      kosong++;
      continue;
    }

    const angka = Number(value);

    if (!Number.isInteger(angka) || angka < 0 || angka > 9) {
      throw new Error(
        `Jawaban kolom ${column + 1}, pasangan ${pair + 1} tidak valid.`
      );
    }

    if (angka === kunci[pair]) {
      benar++;
    } else {
      salah++;
    }
  }

  // Hitung slot kosong dari pasangan pertama sampai jawaban terakhir.
  // Jika tidak ada jawaban, nilainya tetap 0.
  const skipDiperhitungkan = kosong;

  return {
    column,
    benar,
    salah,
    kosong,
    terjawab: benar + salah,
    posisiJawabanTerakhir,
    skipDiperhitungkan,
  };
}

export function hitungRekapScoring(
  answers: JawabanKandidat
): RekapScoring {
  const perKolom = Array.from(
    { length: TOTAL_COLUMNS },
    (_, column) => hitungSkorKolom(column, answers)
  );

  const totalBenar = perKolom.reduce(
    (total, hasil) => total + hasil.benar,
    0
  );

  const totalSalah = perKolom.reduce(
    (total, hasil) => total + hasil.salah,
    0
  );

  const totalKosong = perKolom.reduce(
    (total, hasil) => total + hasil.kosong,
    0
  );

  const totalTerjawab = totalBenar + totalSalah;

  // Hanya menghitung pasangan dalam rentang perhitungan setiap kolom.
  const totalSoal = perKolom.reduce(
    (total, hasil) => total + hasil.posisiJawabanTerakhir,
    0
  );

  return {
    perKolom,
    totalBenar,
    totalSalah,
    totalKosong,
    totalTerjawab,
    totalSoal,
  };
}
