
  import "server-only";

  // ==================================================
  // 1. TIPE DATA
  // ==================================================

  export type EducationGroup =
    | "SMA_IPA"
    | "SMA_IPS"
    | "S1_IPA"
    | "S1_IPS";

  export type NormCategory =
    | "BAIK_SEKALI"
    | "BAIK"
    | "SEDANG"
    | "KURANG"
    | "KURANG_SEKALI";

  export type NormStatus =
    | "READY"
    | "NOT_MAPPED"
    | "AMBIGUOUS";

  export type NormIndicator =
    | "PANKER"
    | "TIANKER"
    | "JANKER_AVERAGE_DEVIATION"
    | "HANKER";

  interface NormRange {
    category: NormCategory;
    min: number | null;
    max: number | null;
  }

  export interface NormResult {
    indicator: NormIndicator;
    rawValue: number;
    educationGroup: EducationGroup;
    category: NormCategory | null;
    status: NormStatus;
  }

  // ==================================================
  // 2. FUNGSI UMUM PENCOCOKAN NORMA
  // Batas rentang inklusif.
  // Nilai tumpang tindih atau tidak terpetakan
  // tidak dipaksakan menjadi kategori.
  // ==================================================

  function matchNorm(
    indicator: NormIndicator,
    value: number,
    educationGroup: EducationGroup,
    ranges: NormRange[]
  ): NormResult {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Nilai ${indicator} harus berupa angka yang valid.`
      );
    }

    const matches = ranges.filter((range) => {
      const aboveMin =
        range.min === null || value >= range.min;

      const belowMax =
        range.max === null || value <= range.max;

      return aboveMin && belowMax;
    });

    if (matches.length === 0) {
      return {
        indicator,
        rawValue: value,
        educationGroup,
        category: null,
        status: "NOT_MAPPED",
      };
    }

    if (matches.length > 1) {
      return {
        indicator,
        rawValue: value,
        educationGroup,
        category: null,
        status: "AMBIGUOUS",
      };
    }

    return {
      indicator,
      rawValue: value,
      educationGroup,
      category: matches[0].category,
      status: "READY",
    };
  }

  // ==================================================
  // 3. PANKER
  // Input: rata-rata jumlah jawaban benar per kolom.
  // ==================================================

  const PANKER_SMA: NormRange[] = [
    { category: "BAIK_SEKALI", min: 14.599, max: null },
    { category: "BAIK", min: 12.484, max: 14.598 },
    { category: "SEDANG", min: 10.368, max: 12.483 },
    { category: "KURANG", min: 8.258, max: 10.367 },
    { category: "KURANG_SEKALI", min: null, max: 8.257 },
  ];

  const PANKER_S1_IPA: NormRange[] = [
    { category: "BAIK_SEKALI", min: 17.209, max: null },
    { category: "BAIK", min: 14.973, max: 17.208 },
    { category: "SEDANG", min: 12.736, max: 14.972 },
    { category: "KURANG", min: 10.500, max: 12.735 },
    { category: "KURANG_SEKALI", min: null, max: 10.499 },
  ];

  const PANKER_S1_IPS: NormRange[] = [
    { category: "BAIK_SEKALI", min: 16.746, max: null },
    { category: "BAIK", min: 14.362, max: 16.745 },
    { category: "SEDANG", min: 11.977, max: 14.361 },
    { category: "KURANG", min: 9.593, max: 11.976 },
    { category: "KURANG_SEKALI", min: null, max: 9.592 },
  ];

  export function normPanker(
    value: number,
    educationGroup: EducationGroup
  ): NormResult {
    const ranges =
      educationGroup === "S1_IPA"
        ? PANKER_S1_IPA
        : educationGroup === "S1_IPS"
          ? PANKER_S1_IPS
          : PANKER_SMA;

    return matchNorm("PANKER", value, educationGroup, ranges);
  }

  // ==================================================
  // 4. TIANKER
  // Input: total kesalahan + skip dalam rentang
  // pasangan 1 sampai posisi jawaban terakhir.
  // ==================================================

  const TIANKER_SMA_IPA: NormRange[] = [
    { category: "BAIK_SEKALI", min: 0, max: 2 },
    { category: "BAIK", min: 3, max: 5 },
    { category: "SEDANG", min: 6, max: 14 },
    { category: "KURANG", min: 15, max: 24 },
    { category: "KURANG_SEKALI", min: 25, max: null },
  ];

  const TIANKER_SMA_IPS: NormRange[] = [
    { category: "BAIK_SEKALI", min: 0, max: 2 },
    { category: "BAIK", min: 3, max: 7 },
    { category: "SEDANG", min: 8, max: 12 },
    { category: "KURANG", min: 13, max: 22 },
    { category: "KURANG_SEKALI", min: 23, max: null },
  ];

  const TIANKER_S1: NormRange[] = [
    { category: "BAIK_SEKALI", min: 0, max: 0 },
    { category: "BAIK", min: 1, max: 2 },
    { category: "SEDANG", min: 3, max: 13 },
    { category: "KURANG", min: 14, max: 22 },
    { category: "KURANG_SEKALI", min: 23, max: null },
  ];

  export function normTianker(
    totalTianker: number,
    educationGroup: EducationGroup
  ): NormResult {
    const ranges =
      educationGroup === "SMA_IPA"
        ? TIANKER_SMA_IPA
        : educationGroup === "SMA_IPS"
          ? TIANKER_SMA_IPS
          : TIANKER_S1;

    return matchNorm(
      "TIANKER",
      totalTianker,
      educationGroup,
      ranges
    );
  }

  // ==================================================
  // 5. JANKER — MEAN ABSOLUTE DEVIATION
  // Input: Σ|Y - mean Y| / 50.
  // Menggunakan rentang norma yang tersedia sebelumnya.
  // ==================================================

  const JANKER_AD_SMA: NormRange[] = [
    { category: "BAIK_SEKALI", min: null, max: 0.294 },
    { category: "BAIK", min: 0.295, max: 0.966 },
    { category: "SEDANG", min: 0.967, max: 1.368 },
    { category: "KURANG", min: 1.369, max: 2.310 },
    { category: "KURANG_SEKALI", min: 2.311, max: null },
  ];

  const JANKER_AD_S1: NormRange[] = [
    { category: "BAIK_SEKALI", min: null, max: 0.695 },
    { category: "BAIK", min: 0.696, max: 1.055 },
    { category: "SEDANG", min: 1.056, max: 1.417 },
    { category: "KURANG", min: 1.418, max: 1.778 },
    { category: "KURANG_SEKALI", min: 1.779, max: null },
  ];

  export function normJankerAverageDeviation(
    value: number,
    educationGroup: EducationGroup
  ): NormResult {
    const ranges =
      educationGroup === "SMA_IPA" ||
      educationGroup === "SMA_IPS"
        ? JANKER_AD_SMA
        : JANKER_AD_S1;

    return matchNorm(
      "JANKER_AVERAGE_DEVIATION",
      value,
      educationGroup,
      ranges
    );
  }

  // ==================================================
  // 6. HANKER
  // Input: nilai akhir X50 - X0 (mempertahankan tanda:
  // positif = tren meningkat, negatif = tren menurun).
  // CATATAN: rentang norma asli masih perlu diverifikasi
  // karena tabel yang tersedia mencakup batas negatif.
  // ==================================================

  const HANKER_SMA: NormRange[] = [
    { category: "BAIK_SEKALI", min: 6.285, max: null },
    { category: "BAIK", min: 3.492, max: 6.283 },
    { category: "SEDANG", min: 0.699, max: 3.491 },
    { category: "KURANG", min: -2.093, max: 0.698 },
    { category: "KURANG_SEKALI", min: null, max: -2.094 },
  ];

  const HANKER_S1: NormRange[] = [
    { category: "BAIK_SEKALI", min: 2.497, max: null },
    { category: "BAIK", min: 1.015, max: 2.496 },
    { category: "SEDANG", min: -0.468, max: 1.014 },
    { category: "KURANG", min: -1.950, max: -0.469 },
    { category: "KURANG_SEKALI", min: null, max: -1.951 },
  ];

  export function normHanker(
    hankerValue: number,
    educationGroup: EducationGroup
  ): NormResult {
    const ranges =
      educationGroup === "SMA_IPA" ||
      educationGroup === "SMA_IPS"
        ? HANKER_SMA
        : HANKER_S1;

    return matchNorm(
      "HANKER",
      hankerValue,
      educationGroup,
      ranges
    );
  }
