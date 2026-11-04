import { NextResponse } from "next/server";
import {
  calculateKraepelin,
  type KraepelinColumnInput,
} from "@/lib/server/kraepelin";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  // 1. Skenario Stabil: 10 benar + 2 salah -> Y = 12 untuk semua kolom
  const dataStabil: KraepelinColumnInput[] = Array.from(
    { length: 50 },
    (_, index) => ({
      column: index + 1,
      correct: 10,
      error: 2,
      lastAnsweredPair: 12,
      skipped: 0,
    })
  );

  // 2. Skenario Meningkat: b positif
  const dataMeningkat: KraepelinColumnInput[] = Array.from(
    { length: 50 },
    (_, index) => {
      const correct = Math.min(27, index + 1);
      return {
        column: index + 1,
        correct,
        error: 0,
        lastAnsweredPair: correct,
        skipped: 0,
      };
    }
  );

  // 3. Skenario Menurun: b negatif
  const dataMenurun: KraepelinColumnInput[] = Array.from(
    { length: 50 },
    (_, index) => {
      const correct = Math.min(27, 50 - index);
      return {
        column: index + 1,
        correct,
        error: 0,
        lastAnsweredPair: correct,
        skipped: 0,
      };
    }
  );

  // 4. Skenario Error Nol
  const dataErrorNol: KraepelinColumnInput[] = Array.from(
    { length: 50 },
    (_, index) => ({
      column: index + 1,
      correct: 15,
      error: 0,
      lastAnsweredPair: 15,
      skipped: 0,
    })
  );

  // 5. Skenario Skip Bukan Nol: Y = Benar + Salah, Skip diabaikan dari Y
  const dataSkipBukanNol: KraepelinColumnInput[] = Array.from(
    { length: 50 },
    (_, index) => ({
      column: index + 1,
      correct: 8,
      error: 2,
      lastAnsweredPair: 14,
      skipped: 4, // 8 + 2 + 4 = 14
    })
  );

  // Jalankan perhitungan
  const stabil = calculateKraepelin(dataStabil);
  const meningkat = calculateKraepelin(dataMeningkat);
  const menurun = calculateKraepelin(dataMenurun);
  const errorNol = calculateKraepelin(dataErrorNol);
  const skipBukanNol = calculateKraepelin(dataSkipBukanNol);

  // Uji validasi penolakan data tidak lengkap (< 50 kolom)
  let validasiKolomKurangDitolak = false;
  try {
    calculateKraepelin(dataStabil.slice(0, 49));
  } catch {
    validasiKolomKurangDitolak = true;
  }

  // Pengujian 11 Butir Wajib (Section 14):
  const pengujian = {
    // 1. Perhitungan X dan X²
    tabel1XdanX2:
      stabil.table1.summary.sigmaX === 1275 &&
      stabil.table1.summary.sigmaX2 === 42925 &&
      stabil.table1.rows.every((r) => r.x2 === r.x * r.x),

    // 2. Perhitungan Y = Benar + Salah
    perhitunganY:
      stabil.table1.rows.every((r) => r.y === r.correct + r.error) &&
      stabil.table1.rows[0].y === 12 &&
      skipBukanNol.table1.rows[0].y === 10, // 8 benar + 2 salah, skip 4 tidak masuk

    // 3. Perhitungan X.Y
    perhitunganXY:
      stabil.table1.rows.every((r) => r.xy === r.x * r.y) &&
      stabil.table1.summary.sigmaXY === 1275 * 12,

    // 4. Distribusi frekuensi (Σf = 50, Y tersusun menurun)
    distribusiFrekuensi:
      stabil.table2.summary.sigmaF === 50 &&
      meningkat.table2.summary.sigmaF === 50 &&
      meningkat.table2.rows.every(
        (r, i, arr) => i === 0 || arr[i - 1].y > r.y
      ),

    // 5. Perhitungan f.y dan Σ(f.y) == ΣY Tabel 1
    perhitunganFY:
      stabil.table2.summary.sigmaFY === stabil.table1.summary.sigmaY &&
      meningkat.table2.summary.sigmaFY === meningkat.table1.summary.sigmaY,

    // 6. Perhitungan d = |Y - Mean|
    perhitunganD:
      stabil.table2.rows.every((r) => r.d === 0) &&
      skipBukanNol.table2.rows.every((r) => r.d === 0),

    // 7. Perhitungan f.d
    perhitunganFD:
      stabil.table2.summary.sigmaFD === 0 &&
      meningkat.table2.rows.every(
        (r) => Math.abs(r.fd - r.f * r.d) < 1e-4
      ),

    // 8. Panker: Panker 1 == Panker 2
    pankerKonsisten:
      stabil.panker.panker1 === stabil.panker.panker2 &&
      stabil.panker.value === 12 &&
      meningkat.panker.panker1 === meningkat.panker.panker2 &&
      meningkat.panker.value === 19.98,

    // 9. Tianker: hanya dari Error (Skip tidak dihitung)
    tiankerHanyaError:
      stabil.tianker.value === 100 &&
      errorNol.tianker.value === 0 &&
      skipBukanNol.tianker.value === 100, // 50 * 2 salah, skip 200 diabaikan

    // 10. Janker: berdasarkan Σ(f.d) / N
    jankerStandarDeviasi:
      stabil.janker.value === 0 &&
      meningkat.janker.value > 0 &&
      meningkat.janker.value ===
        Number((meningkat.table2.summary.sigmaFD / 50).toFixed(4)),

    // 11. Hanker: regresi linear, retensi tanda positif/negatif
    hankerRegresiLinear:
      stabil.hanker.value === 0 &&
      meningkat.hanker.b > 0 &&
      meningkat.hanker.value > 0 &&
      menurun.hanker.b < 0 &&
      menurun.hanker.value < 0 &&
      Math.abs(meningkat.hanker.value - 50 * meningkat.hanker.b) < 1e-4,

    // Validasi penolakan data < 50 kolom
    validasiKolomKurangDitolak,
  };

  const semuaLulus = Object.values(pengujian).every(Boolean);

  return NextResponse.json({
    status: semuaLulus ? "SEMUA_PENGUJIAN_LULUS" : "ADA_PENGUJIAN_GAGAL",
    semuaLulus,
    pengujian,
    hasilSkenario: {
      stabil: {
        panker: stabil.panker.value,
        tianker: stabil.tianker.value,
        janker: stabil.janker.value,
        hanker: stabil.hanker.value,
        validasi: stabil.validation.isValid,
      },
      meningkat: {
        panker: meningkat.panker.value,
        tianker: meningkat.tianker.value,
        janker: meningkat.janker.value,
        hanker: meningkat.hanker.value,
        validasi: meningkat.validation.isValid,
      },
      menurun: {
        panker: menurun.panker.value,
        tianker: menurun.tianker.value,
        janker: menurun.janker.value,
        hanker: menurun.hanker.value,
        validasi: menurun.validation.isValid,
      },
      skipBukanNol: {
        panker: skipBukanNol.panker.value,
        tianker: skipBukanNol.tianker.value,
        yKolom1: skipBukanNol.table1.rows[0].y,
        validasi: skipBukanNol.validation.isValid,
      },
    },
  });
}
