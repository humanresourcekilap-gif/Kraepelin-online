
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

  // Verifikasi rumus distribusi frekuensi PANKER identik dengan direct sum
  const checkPanker = (
    data: KraepelinColumnInput[],
    panker: { value: number; sigmaY: number }
  ) => {
    const directSigmaY = data.reduce((sum, item) => sum + item.correct, 0);
    const directValue = Number((directSigmaY / 50).toFixed(4));
    const selisih = Math.abs(panker.value - directValue);
    return {
      directSigmaY,
      directValue,
      sigmaYSama: panker.sigmaY === directSigmaY,
      valueSama: panker.value === directValue,
      selisih,
      lulus:
        panker.sigmaY === directSigmaY &&
        panker.value === directValue &&
        selisih < 1e-9,
    };
  };

  const verifikasiPanker = {
    stabil: checkPanker(dataStabil, stabil.panker),
    meningkat: checkPanker(dataMeningkat, meningkat.panker),
    menurun: checkPanker(dataMenurun, menurun.panker),
  };

  const semuaPankerIdentik =
    verifikasiPanker.stabil.lulus &&
    verifikasiPanker.meningkat.lulus &&
    verifikasiPanker.menurun.lulus;

  return NextResponse.json({
    verifikasiPanker: {
      semuaPankerIdentik,
      skenario: verifikasiPanker,
    },

    stabil: {
      hasil: stabil,
      lulus:
        stabil.panker.value === 10 &&
        stabil.panker.sigmaY === 500 &&
        verifikasiPanker.stabil.lulus &&
        stabil.tianker.value === 100 &&
        stabil.janker.meanAbsoluteDeviation === 0 &&
        stabil.hanker.value === 0,
    },

    meningkat: {
      hasil: meningkat,
      lulusPanker:
        meningkat.panker.value === 19.98 &&
        meningkat.panker.sigmaY === 999 &&
        verifikasiPanker.meningkat.lulus,
      kemiringanPositif: meningkat.hanker.bRaw > 0,
      hankerPositif: meningkat.hanker.value > 0,
    },

    menurun: {
      hasil: menurun,
      lulusPanker:
        menurun.panker.value === 19.98 &&
        menurun.panker.sigmaY === 999 &&
        verifikasiPanker.menurun.lulus,
      kemiringanNegatif: menurun.hanker.bRaw < 0,
      hankerNegatif: menurun.hanker.value < 0,
    },
  });
}
