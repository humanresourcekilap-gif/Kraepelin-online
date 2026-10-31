
import "server-only";

/**
 * Kraepelin Indicator Calculator
 *
 * Perhitungan indikator berdasarkan pedoman yang telah dikonfirmasi.
 * Pure helper: tidak mengakses database, browser, atau kunci jawaban.
 */

// ==================================================
// 1. TIPE DATA
// ==================================================

export interface KraepelinColumnInput {
  column: number; // Nomor kolom: 1–50
  correct: number; // Y: jumlah jawaban benar
  error: number; // Jumlah jawaban salah dalam rentang perhitungan
  lastAnsweredPair: number; // Posisi jawaban terakhir: 0–27
  skipped: number; // Kosong dalam pasangan 1 sampai posisi terakhir
}

export interface PankerResult {
  value: number;
  sigmaY: number;
}

export interface TiankerResult {
  value: number;
  totalError: number;
  totalSkipped: number;
}

export interface JankerResult {
  mean: number;
  sumAbsoluteDeviation: number;
  meanAbsoluteDeviation: number;
}

export interface HankerResult {
  value: number;
  bRaw: number;
  bAbs: number;
  a: number;
  x0: number;
  x50: number;
  sigmaX: number;
  sigmaX2: number;
  sigmaXY: number;
  denominator: number;
}

export interface KraepelinResult {
  panker: PankerResult;
  tianker: TiankerResult;
  janker: JankerResult;
  hanker: HankerResult;
}

// ==================================================
// 2. KONSTANTA DASAR
// ==================================================

const N = 50;
const SIGMA_X = 1275;
const SIGMA_X2 = 42925;
const DENOMINATOR = N * SIGMA_X2 - SIGMA_X ** 2;

// ==================================================
// 3. VALIDASI INPUT
// ==================================================

function validateInput(data: KraepelinColumnInput[]): void {
  if (data.length !== N) {
    throw new Error(`Data harus terdiri dari tepat ${N} kolom.`);
  }

  const sorted = [...data].sort((a, b) => a.column - b.column);

  sorted.forEach((item, index) => {
    if (item.column !== index + 1) {
      throw new Error(
        "Nomor kolom harus lengkap dan unik dari 1 sampai 50."
      );
    }

    for (const [field, value] of [
      ["correct", item.correct],
      ["error", item.error],
      ["lastAnsweredPair", item.lastAnsweredPair],
      ["skipped", item.skipped],
    ] as const) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(
          `${field} pada kolom ${item.column} harus berupa bilangan bulat nonnegatif.`
        );
      }
    }

    if (
      item.correct > 27 ||
      item.error > 27 ||
      item.lastAnsweredPair > 27 ||
      item.skipped > item.lastAnsweredPair ||
      item.correct + item.error + item.skipped !== item.lastAnsweredPair
    ) {
      throw new Error(
        `Jumlah jawaban pada kolom ${item.column} tidak konsisten.`
      );
    }
  });
}

// ==================================================
// 4. PANKER
// PANKER = SIGMA Y / N
// Y = jumlah jawaban benar per kolom
// ==================================================

export function calculatePanker(
  data: KraepelinColumnInput[]
): PankerResult {
  const sigmaY = data.reduce(
    (sum, item) => sum + item.correct,
    0
  );

  return {
    value: Number((sigmaY / N).toFixed(4)),
    sigmaY,
  };
}

// ==================================================
// 5. TIANKER
// TIANKER = TOTAL ERROR (Hanya total kesalahan)
// Skip hanya dihitung dalam rentang 1–jawaban terakhir.
// ==================================================

export function calculateTianker(
  data: KraepelinColumnInput[]
): TiankerResult {
  const totalError = data.reduce(
    (sum, item) => sum + item.error,
    0
  );

  const totalSkipped = data.reduce(
    (sum, item) => sum + item.skipped,
    0
  );

  return {
    value: totalError,
    totalError,
    totalSkipped,
  };
}

// ==================================================
// 6. JANKER
// d = |Y - mean Y|
// JANKER = SIGMA(f × d) / N
//
// Karena data berupa 50 kolom individual, menghitung
// deviasi setiap kolom setara dengan menggunakan tabel frekuensi.
// ==================================================

export function calculateJanker(
  data: KraepelinColumnInput[],
  panker?: number
): JankerResult {
  const sigmaY = data.reduce(
    (sum, item) => sum + item.correct,
    0
  );

  const mean = panker !== undefined ? panker : sigmaY / N;

  const sumAbsoluteDeviation = data.reduce(
    (sum, item) => sum + Math.abs(item.correct - mean),
    0
  );

  return {
    mean: Number(mean.toFixed(4)),
    sumAbsoluteDeviation: Number(sumAbsoluteDeviation.toFixed(4)),
    meanAbsoluteDeviation: Number((sumAbsoluteDeviation / N).toFixed(4)),
  };
}

// ==================================================
// 7. HANKER
// Regresi linear berdasarkan Y = jumlah jawaban benar.
// HANKER = |X50 - X0|
// ==================================================


export function calculateHanker(
  data: KraepelinColumnInput[],
  panker?: PankerResult
): HankerResult {
  const sigmaY = panker ? panker.sigmaY : data.reduce((sum, item) => sum + item.correct, 0);

  const sigmaXY = data.reduce(
    (sum, item) => sum + item.column * item.correct,
    0
  );

  const meanY = panker ? panker.value : sigmaY / N;

  const bRaw =
    (N * sigmaXY - SIGMA_X * sigmaY) / DENOMINATOR;

  const meanX = SIGMA_X / N;
  const a = meanY - bRaw * meanX;

  const x0 = a;
  const x50 = a + bRaw * N;

  // Pertahankan tanda: positif atau negatif.
  const hanker = x50 - x0;

  return {
    value: Number(hanker.toFixed(4)),
    bRaw: Number(bRaw.toFixed(10)),
    bAbs: Number(Math.abs(bRaw).toFixed(10)),
    a: Number(a.toFixed(10)),
    x0: Number(x0.toFixed(10)),
    x50: Number(x50.toFixed(10)),
    sigmaX: SIGMA_X,
    sigmaX2: SIGMA_X2,
    sigmaXY,
    denominator: DENOMINATOR,
  };
}


// ==================================================
// 8. FUNGSI UTAMA
// ==================================================

export function calculateKraepelin(
  inputData: KraepelinColumnInput[]
): KraepelinResult {
  validateInput(inputData);

  const data = [...inputData].sort(
    (a, b) => a.column - b.column
  );

  const panker = calculatePanker(data);
  const tianker = calculateTianker(data);
  const janker = calculateJanker(data);
  const hanker = calculateHanker(data);

  return {
    panker,
    tianker,
    janker,
    hanker,
  };
}
