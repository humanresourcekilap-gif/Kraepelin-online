
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

  // Skenario A: stabil, 10 benar + 2 salah per kolom.
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

  // Skenario B: jumlah jawaban benar meningkat.
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

  // Skenario C: jumlah jawaban benar menurun.
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

  const stabil = calculateKraepelin(dataStabil);
  const meningkat = calculateKraepelin(dataMeningkat);
  const menurun = calculateKraepelin(dataMenurun);

  return NextResponse.json({
    stabil: {
      hasil: stabil,
      lulus:
        stabil.panker.value === 10 &&
        stabil.tianker.value === 100 &&
        stabil.janker.meanAbsoluteDeviation === 0 &&
        stabil.hanker.value === 0,
    },

    meningkat: {
      hasil: meningkat,
      kemiringanPositif: meningkat.hanker.bRaw > 0,
      hankerPositif: meningkat.hanker.value > 0,
    },

    menurun: {
      hasil: menurun,
      kemiringanNegatif: menurun.hanker.bRaw < 0,
      hankerNegatif: menurun.hanker.value < 0,
    },
  });
}
