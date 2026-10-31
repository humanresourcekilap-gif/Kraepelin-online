import { NextResponse } from "next/server";
import {
  normPanker,
  normTianker,
  normJankerAverageDeviation,
  normHanker,
  type EducationGroup,
} from "../../../lib/server/kraepelin-norma";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  const tests = [
    {
      indikator: "PANKER",
      kelompok: "SMA_IPA" as EducationGroup,
      hasil: normPanker(11, "SMA_IPA"),
    },
    {
      indikator: "TIANKER",
      kelompok: "SMA_IPS" as EducationGroup,
      hasil: normTianker(5, "SMA_IPS"),
    },

    {
      indikator: "JANKER_AVERAGE_DEVIATION",
      kelompok: "S1_IPS" as EducationGroup,
      hasil: normJankerAverageDeviation(0.8, "S1_IPS"),
    },
    {
      indikator: "HANKER",
      kelompok: "SMA_IPA" as EducationGroup,
      hasil: normHanker(4, "SMA_IPA"),
    },
  ];

  return NextResponse.json({
    jumlahPengujian: tests.length,
    semuaFungsiTerpanggil: tests.length === 4,
    hasil: tests,
  });
}
