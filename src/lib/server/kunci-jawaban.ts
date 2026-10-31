
import "server-only";

import {
  DATA_SOAL,
  TOTAL_COLUMNS,
  NUMBERS_PER_COLUMN,
} from "@/app/tes/data-soal";

export const KUNCI_JAWABAN: number[][] = DATA_SOAL.map(
  (numbers, columnIndex) => {
    if (numbers.length !== NUMBERS_PER_COLUMN) {
      throw new Error(
        `Jumlah angka kolom ${columnIndex + 1} tidak sesuai.`
      );
    }

    return numbers.slice(0, -1).map((number, index) => {
      return (number + numbers[index + 1]) % 10;
    });
  }
);

if (KUNCI_JAWABAN.length !== TOTAL_COLUMNS) {
  throw new Error("Jumlah kunci jawaban tidak sesuai.");
}
