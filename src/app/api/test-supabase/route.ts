
import { NextResponse } from "next/server";
import { supabase } from "@/lib/server/supabase";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Khusus pengujian development." },
      { status: 404 }
    );
  }

  try {
    const { error } = await supabase
      .from("connection_test")
      .select("id")
      .limit(1);

    // Error tabel belum ada tetap berarti permintaan
    // sudah mencapai API Supabase, bukan koneksi gagal.
    if (error) {
      const tableMissing =
        error.code === "42P01" ||
        error.code === "PGRST205";

      if (tableMissing) {
        return NextResponse.json({
          success: true,
          connection: "connected",
          message:
            "Supabase terhubung. Tabel connection_test belum dibuat, dan itu normal.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          connection: "api_reached",
          message: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: "connected",
      message: "Koneksi Supabase berhasil.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menguji koneksi.",
      },
      { status: 500 }
    );
  }
}
