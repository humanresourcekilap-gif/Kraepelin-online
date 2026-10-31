
import { NextResponse } from "next/server";
import {
  normPanker,
  normTianker,
  normJankerAverageDeviation,
  normHanker,
} from "@/lib/server/kraepelin-norma";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  const pengujian = [
    {
      nama: "PANKER SMA pada nilai 12.5",
      nilai: 12.5,
      hasil: normPanker(12.5, "SMA_IPA"),
    },
    {
      nama: "PANKER S1 IPA pada nilai 17.209",
      nilai: 17.209,
      hasil: normPanker(17.209, "S1_IPA"),
    },
    {
      nama: "PANKER S1 IPS pada nilai 16.75",
      nilai: 16.75,
      hasil: normPanker(16.75, "S1_IPS"),
    },
    {
      nama: "TIANKER SMA IPA pada nilai 3",
      nilai: 3,
      hasil: normTianker(3, "SMA_IPA"),
    },
    {
      nama: "TIANKER SMA IPA pada nilai 7",
      nilai: 7,
      hasil: normTianker(7, "SMA_IPA"),
    },
    {
      nama: "JANKER SMA pada nilai 0.2945",
      nilai: 0.2945,
      hasil: normJankerAverageDeviation(0.2945, "SMA_IPA"),
    },
    {
      nama: "HANKER S1 pada nilai -0.47",
      nilai: -0.47,
      hasil: normHanker(-0.47, "S1_IPA"),
    },
  ];

  return NextResponse.json({
    status: "PENGUJIAN SELESAI",
    catatan:
      "Hasil menunjukkan perilaku kode saat ini, bukan penetapan norma yang benar.",
    pengujian,
  });
}
