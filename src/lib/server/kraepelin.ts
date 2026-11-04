import "server-only";

/**
 * Kraepelin Indicator Calculator & Table Generator
 *
 * Mengimplementasikan modul perhitungan psikometrik Tes Kraepelin (Tes Koran)
 * sesuai spesifikasi acuan manual:
 * 1. Nilai Y = Benar + Salah (total seluruh jawaban terisi per kolom, exclude skip)
 * 2. Tabel 1 (Hasil Lembar Kerja): X, X², Y, X.Y
 * 3. Tabel 2 (Distribusi Frekuensi): Y, f, f.y, d, f.d (Y sorted descending)
 * 4. PANKER = Mean1 = Σ(f.y) / N (Tabel 2) == ΣY / N (Tabel 1)
 * 5. TIANKER = ΣError (hanya total kesalahan)
 * 6. JANKER = Σ(f.d) / N (Standar deviasi deviasi rata-rata)
 * 7. HANKER = Y50 - Y0 = 50 * b (Analisis regresi linear)
 * 8. Aturan presisi konsisten 4 angka di belakang koma (round4)
 * 9. Validasi konsistensi matematis otomatis
 *
 * Pure helper: tidak mengakses database, browser, atau kunci jawaban.
 */

// ==================================================
// 1. HELPER PEMBULATAN PRESISI (4 DESIMAL)
// ==================================================

/**
 * Membulatkan angka ke 4 angka di belakang koma secara konsisten
 * untuk mencegah floating-point rounding issue pada perhitungan manual.
 */
export function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  return sign * Number(Math.round(Number(abs + "e+4")) + "e-4");
}

/**
 * Memformat angka ke string dengan tepat 4 angka di belakang koma (contoh: "8.0000", "0.9720").
 */
export function format4(value: number): string {
  return round4(value).toFixed(4);
}

// ==================================================
// 2. TIPE DATA & STRUKTUR TABEL
// ==================================================

export interface KraepelinColumnInput {
  column: number; // Nomor kolom: 1–50 (X)
  correct: number; // Jumlah jawaban benar
  error: number; // Jumlah jawaban salah dalam rentang perhitungan
  lastAnsweredPair: number; // Posisi jawaban terakhir: 0–27
  skipped: number; // Kosong dalam rentang 1 sampai posisi terakhir
  y?: number; // Nilai kerja Y (opsional, jika tidak ada dihitung: correct + error)
}

// --- Tabel 1: Hasil Lembar Kerja ---
export interface Table1Row {
  x: number; // Nomor urut kolom (1..50)
  x2: number; // Kuadrat X (X * X)
  y: number; // Hasil kerja (Benar + Salah)
  xy: number; // Perkalian X dan Y (X * Y)
  correct: number; // Benar
  error: number; // Salah
  skipped: number; // Skip (tidak masuk Y)
}

export interface Table1Summary {
  sigmaX: number; // ΣX = 1.275
  sigmaX2: number; // ΣX² = 42.925
  sigmaY: number; // ΣY = jumlah seluruh Y aktual
  sigmaXY: number; // ΣXY = jumlah seluruh perkalian X * Y
  meanX: number; // X̄ = ΣX / N = 25.5
  meanY: number; // Ȳ = ΣY / N (round4)
}

export interface Table1 {
  rows: Table1Row[];
  summary: Table1Summary;
}

// --- Tabel 2: Distribusi Frekuensi ---
export interface Table2Row {
  y: number; // Nilai hasil kerja unik (disusun menurun)
  f: number; // Frekuensi kemunculan nilai Y
  fy: number; // f * y
  d: number; // Simpangan absolut |Y - Mean| (round4)
  fd: number; // f * d (round4)
}

export interface Table2Summary {
  sigmaYUnique: number; // ΣY = jumlah seluruh nilai unik Y pada tabel distribusi
  sigmaF: number; // Σf = 50 (harus sama dengan 50)
  sigmaFY: number; // Σ(f.y) = harus sama dengan ΣY pada Tabel 1
  sigmaD: number; // Σd = jumlah seluruh nilai d pada setiap baris distribusi
  sigmaFD: number; // Σ(f.d) = jumlah seluruh hasil perkalian f * d (round4)
  mean: number; // Mean = Σ(f.y) / 50 (round4)
}

export interface Table2 {
  rows: Table2Row[];
  summary: Table2Summary;
}

// --- Hasil Indikator Psikometrik ---
export interface PankerResult {
  value: number; // Hasil PANKER resmi (round4)
  panker1: number; // PANKER dari Tabel 1 (ΣY / N)
  panker2: number; // PANKER dari Tabel 2 (Σ(f.y) / N)
  sigmaY: number; // ΣY (kompatibilitas backward)
  formatted: string;
}

export interface TiankerResult {
  value: number; // TIANKER = ΣError
  totalError: number;
  totalSkipped: number;
  formatted: string;
}

export interface JankerResult {
  value: number; // JANKER = Σ(f.d) / N (round4)
  mean: number; // Mean Y (round4)
  sumAbsoluteDeviation: number; // Σ(f.d)
  meanAbsoluteDeviation: number; // Alias untuk value (kompatibilitas backward)
  sigmaFD: number; // Σ(f.d)
  formatted: string;
}

export interface HankerResult {
  value: number; // HANKER = Y50 - Y0 = 50 * b (round4)
  b: number; // Koefisien regresi b (round4)
  bRaw: number; // Nilai mentah presisi tinggi
  bAbs: number; // |b|
  a: number; // Konstanta regresi a (round4)
  x0: number; // X = 0
  x50: number; // X = 50
  y0: number; // Y0 = a (round4)
  y50: number; // Y50 = a + b * 50 (round4)
  meanX: number; // 25.5
  meanY: number; // Ȳ (round4)
  sigmaX: number; // 1275
  sigmaX2: number; // 42925
  sigmaY: number; // ΣY
  sigmaXY: number; // ΣXY
  numerator: number; // N * ΣXY - ΣX * ΣY
  denominator: number; // N * ΣX² - (ΣX)² = 520625
  formatted: string;
}

// --- Audit & Validasi Matematis ---
export interface ValidationCheck {
  name: string;
  expected: string | number;
  actual: string | number;
  valid: boolean;
}

export interface KraepelinValidationResult {
  isValid: boolean;
  errors: string[];
  checks: ValidationCheck[];
}

export interface KraepelinResult {
  panker: PankerResult;
  tianker: TiankerResult;
  janker: JankerResult;
  hanker: HankerResult;
  table1: Table1;
  table2: Table2;
  validation: KraepelinValidationResult;
}

// ==================================================
// 3. KONSTANTA DASAR
// ==================================================

export const KRAEPELIN_N = 50;
export const KRAEPELIN_SIGMA_X = 1275;
export const KRAEPELIN_SIGMA_X2 = 42925;
export const KRAEPELIN_MEAN_X = 25.5; // 1275 / 50
export const KRAEPELIN_DENOMINATOR =
  KRAEPELIN_N * KRAEPELIN_SIGMA_X2 - KRAEPELIN_SIGMA_X ** 2; // 520625

// ==================================================
// 4. VALIDASI INPUT DATA MENTAH
// ==================================================

export function validateInput(data: KraepelinColumnInput[]): void {
  if (data.length !== KRAEPELIN_N) {
    throw new Error(`Data harus terdiri dari tepat ${KRAEPELIN_N} kolom.`);
  }

  const sorted = [...data].sort((a, b) => a.column - b.column);

  sorted.forEach((item, index) => {
    if (item.column !== index + 1) {
      throw new Error("Nomor kolom harus lengkap dan unik dari 1 sampai 50.");
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
// 5. TABEL 1 – HASIL LEMBAR KERJA (X, X², Y, X.Y)
// ==================================================

export function buildTable1(data: KraepelinColumnInput[]): Table1 {
  const sorted = [...data].sort((a, b) => a.column - b.column);
  const rows: Table1Row[] = [];
  let sigmaY = 0;
  let sigmaXY = 0;

  for (let i = 0; i < KRAEPELIN_N; i++) {
    const item = sorted[i];
    const x = i + 1;
    const x2 = x * x;
    // Definisi resmi: Y = Benar + Salah (total jawaban terisi per kolom, exclude skip)
    const y = item.y !== undefined ? item.y : item.correct + item.error;
    const xy = x * y;

    sigmaY += y;
    sigmaXY += xy;

    rows.push({
      x,
      x2,
      y,
      xy,
      correct: item.correct,
      error: item.error,
      skipped: item.skipped,
    });
  }

  const meanY = round4(sigmaY / KRAEPELIN_N);

  return {
    rows,
    summary: {
      sigmaX: KRAEPELIN_SIGMA_X,
      sigmaX2: KRAEPELIN_SIGMA_X2,
      sigmaY,
      sigmaXY,
      meanX: KRAEPELIN_MEAN_X,
      meanY,
    },
  };
}

// ==================================================
// 6. TABEL 2 – DISTRIBUSI FREKUENSI (Y, f, f.y, d, f.d)
// ==================================================

export function buildTable2(table1: Table1): Table2 {
  // Hitung frekuensi kemunculan setiap nilai Y dari Tabel 1
  const freqMap = new Map<number, number>();
  for (const row of table1.rows) {
    freqMap.set(row.y, (freqMap.get(row.y) ?? 0) + 1);
  }

  // Urutkan nilai Y unik dari tertinggi ke terendah (descending)
  const uniqueY = Array.from(freqMap.keys()).sort((a, b) => b - a);

  // Mean dihitung dari Σ(f.y) / N, yang setara dengan ΣY Tabel 1 / N
  const mean = round4(table1.summary.sigmaY / KRAEPELIN_N);

  const rows: Table2Row[] = [];
  let sigmaYUnique = 0;
  let sigmaF = 0;
  let sigmaFY = 0;
  let sigmaD = 0;
  let sigmaFD = 0;

  for (const y of uniqueY) {
    const f = freqMap.get(y)!;
    const fy = f * y;
    const d = round4(Math.abs(y - mean));
    const fd = round4(f * d);

    sigmaYUnique += y;
    sigmaF += f;
    sigmaFY += fy;
    sigmaD = round4(sigmaD + d);
    sigmaFD = round4(sigmaFD + fd);

    rows.push({
      y,
      f,
      fy,
      d,
      fd,
    });
  }

  return {
    rows,
    summary: {
      sigmaYUnique,
      sigmaF,
      sigmaFY,
      sigmaD,
      sigmaFD,
      mean,
    },
  };
}

// ==================================================
// 7. PANKER – KECEPATAN KERJA
// Panker 1 = ΣY / N (Tabel 1)
// Panker 2 = Σ(f.y) / N (Tabel 2)
// ==================================================

export function calculatePanker(
  table1OrData: Table1 | KraepelinColumnInput[],
  table2Optional?: Table2
): PankerResult {
  let table1: Table1;
  let table2: Table2;

  if (Array.isArray(table1OrData)) {
    table1 = buildTable1(table1OrData);
    table2 = table2Optional ?? buildTable2(table1);
  } else {
    table1 = table1OrData;
    table2 = table2Optional ?? buildTable2(table1);
  }

  const panker1 = round4(table1.summary.sigmaY / KRAEPELIN_N);
  const panker2 = round4(table2.summary.sigmaFY / KRAEPELIN_N);

  return {
    value: panker1,
    panker1,
    panker2,
    sigmaY: table1.summary.sigmaY,
    formatted: format4(panker1),
  };
}

// ==================================================
// 8. TIANKER – KETELITIAN KERJA
// TIANKER = ΣError (hanya total kesalahan)
// ==================================================

export function calculateTianker(
  data: KraepelinColumnInput[]
): TiankerResult {
  const totalError = data.reduce((sum, item) => sum + item.error, 0);
  const totalSkipped = data.reduce((sum, item) => sum + item.skipped, 0);

  return {
    value: totalError,
    totalError,
    totalSkipped,
    formatted: String(totalError),
  };
}

// ==================================================
// 9. JANKER – KEAJEGAN KERJA
// JANKER = Σ(f.d) / N
// ==================================================

export function calculateJanker(
  table2OrData: Table2 | KraepelinColumnInput[]
): JankerResult {
  let table2: Table2;

  if (Array.isArray(table2OrData)) {
    const table1 = buildTable1(table2OrData);
    table2 = buildTable2(table1);
  } else {
    table2 = table2OrData;
  }

  const janker = round4(table2.summary.sigmaFD / KRAEPELIN_N);

  return {
    value: janker,
    mean: table2.summary.mean,
    sumAbsoluteDeviation: table2.summary.sigmaFD,
    meanAbsoluteDeviation: janker,
    sigmaFD: table2.summary.sigmaFD,
    formatted: format4(janker),
  };
}

// ==================================================
// 10. HANKER – KETAHANAN KERJA
// Regresi Linear: Y = a + bX
// b = [N × ΣXY - (ΣX × ΣY)] / [N × ΣX² - (ΣX)²]
// a = Ȳ - (b × X̄)
// Y50 = a + (b × 50), Y0 = a
// HANKER = Y50 - Y0 = 50 × b
// ==================================================

export function calculateHanker(
  table1OrData: Table1 | KraepelinColumnInput[]
): HankerResult {
  let table1: Table1;

  if (Array.isArray(table1OrData)) {
    table1 = buildTable1(table1OrData);
  } else {
    table1 = table1OrData;
  }

  const { sigmaXY, sigmaY, meanY } = table1.summary;
  const numerator = KRAEPELIN_N * sigmaXY - KRAEPELIN_SIGMA_X * sigmaY;
  const bRaw = numerator / KRAEPELIN_DENOMINATOR;
  // Nilai antara mengikuti pembulatan empat desimal (Section 9)
  const b = round4(bRaw);

  const a = round4(meanY - b * KRAEPELIN_MEAN_X);
  const y0 = a;
  const y50 = round4(a + b * KRAEPELIN_N);
  const hanker = round4(y50 - y0);

  return {
    value: hanker,
    b,
    bRaw,
    bAbs: Math.abs(b),
    a,
    x0: 0,
    x50: KRAEPELIN_N,
    y0,
    y50,
    meanX: KRAEPELIN_MEAN_X,
    meanY,
    sigmaX: KRAEPELIN_SIGMA_X,
    sigmaX2: KRAEPELIN_SIGMA_X2,
    sigmaY,
    sigmaXY,
    numerator,
    denominator: KRAEPELIN_DENOMINATOR,
    formatted: format4(hanker),
  };
}

// ==================================================
// 11. AUDIT DAN VALIDASI MATEMATIS
// ==================================================

export function validateKraepelinResult(
  table1: Table1,
  table2: Table2,
  panker: PankerResult,
  tianker: TiankerResult,
  janker: JankerResult,
  hanker: HankerResult,
  totalError: number
): KraepelinValidationResult {
  const checks: ValidationCheck[] = [];
  const errors: string[] = [];

  // Validasi Tabel 1
  const t1RowCount = table1.rows.length;
  checks.push({
    name: "Tabel 1: Tepat 50 baris",
    expected: 50,
    actual: t1RowCount,
    valid: t1RowCount === KRAEPELIN_N,
  });

  checks.push({
    name: "Tabel 1: ΣX = 1275",
    expected: KRAEPELIN_SIGMA_X,
    actual: table1.summary.sigmaX,
    valid: table1.summary.sigmaX === KRAEPELIN_SIGMA_X,
  });

  checks.push({
    name: "Tabel 1: ΣX² = 42925",
    expected: KRAEPELIN_SIGMA_X2,
    actual: table1.summary.sigmaX2,
    valid: table1.summary.sigmaX2 === KRAEPELIN_SIGMA_X2,
  });

  const sumYRows = table1.rows.reduce((sum, r) => sum + r.y, 0);
  checks.push({
    name: "Tabel 1: ΣY sama dengan penjumlahan seluruh baris Y",
    expected: sumYRows,
    actual: table1.summary.sigmaY,
    valid: table1.summary.sigmaY === sumYRows,
  });

  const sumXYRows = table1.rows.reduce((sum, r) => sum + r.xy, 0);
  checks.push({
    name: "Tabel 1: ΣXY sama dengan penjumlahan seluruh baris X.Y",
    expected: sumXYRows,
    actual: table1.summary.sigmaXY,
    valid: table1.summary.sigmaXY === sumXYRows,
  });

  // Validasi Tabel 2
  checks.push({
    name: "Tabel 2: Σf = 50",
    expected: KRAEPELIN_N,
    actual: table2.summary.sigmaF,
    valid: table2.summary.sigmaF === KRAEPELIN_N,
  });

  checks.push({
    name: "Tabel 2: Σ(f.y) sama dengan ΣY pada Tabel 1",
    expected: table1.summary.sigmaY,
    actual: table2.summary.sigmaFY,
    valid: table2.summary.sigmaFY === table1.summary.sigmaY,
  });

  checks.push({
    name: "Tabel 2: Mean Tabel 1 sama dengan Mean Tabel 2",
    expected: table1.summary.meanY,
    actual: table2.summary.mean,
    valid: table1.summary.meanY === table2.summary.mean,
  });

  // Validasi Antar-Aspek
  checks.push({
    name: "PANKER: Panker 1 (Tabel 1) sama dengan Panker 2 (Tabel 2)",
    expected: panker.panker1,
    actual: panker.panker2,
    valid: panker.panker1 === panker.panker2,
  });

  checks.push({
    name: "TIANKER: Nilai sama dengan total jumlah Error",
    expected: totalError,
    actual: tianker.value,
    valid: tianker.value === totalError,
  });

  const expectedJanker = round4(table2.summary.sigmaFD / KRAEPELIN_N);
  checks.push({
    name: "JANKER: Nilai sama dengan Σ(f.d) / 50",
    expected: expectedJanker,
    actual: janker.value,
    valid: janker.value === expectedJanker,
  });

  const expectedHanker = round4(hanker.y50 - hanker.y0);
  checks.push({
    name: "HANKER: Nilai sama dengan Y50 - Y0",
    expected: expectedHanker,
    actual: hanker.value,
    valid: hanker.value === expectedHanker,
  });

  for (const c of checks) {
    if (!c.valid) {
      errors.push(`${c.name} (Expected: ${c.expected}, Actual: ${c.actual})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    checks,
  };
}

// ==================================================
// 12. FUNGSI UTAMA KALKULASI KRAEPELIN
// ==================================================

export function calculateKraepelin(
  inputData: KraepelinColumnInput[]
): KraepelinResult {
  validateInput(inputData);

  const table1 = buildTable1(inputData);
  const table2 = buildTable2(table1);

  const panker = calculatePanker(table1, table2);
  const tianker = calculateTianker(inputData);
  const janker = calculateJanker(table2);
  const hanker = calculateHanker(table1);

  const validation = validateKraepelinResult(
    table1,
    table2,
    panker,
    tianker,
    janker,
    hanker,
    tianker.value
  );

  return {
    panker,
    tianker,
    janker,
    hanker,
    table1,
    table2,
    validation,
  };
}
