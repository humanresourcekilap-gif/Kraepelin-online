import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";
    const tempatLahir = typeof body.tempatLahir === "string" ? body.tempatLahir.trim() : "";
    const tanggalLahir = typeof body.tanggalLahir === "string" ? body.tanggalLahir : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nomorHP = typeof body.nomorHP === "string" ? body.nomorHP.trim() : "";
    const posisi = typeof body.posisi === "string" ? body.posisi.trim() : "";
    const jenjangPendidikan = typeof body.jenjangPendidikan === "string" ? body.jenjangPendidikan.trim() : "";
    const jurusan = typeof body.jurusan === "string" ? body.jurusan.trim() : "";
    const kelompokPendidikan = typeof body.kelompokPendidikan === "string" ? body.kelompokPendidikan.trim() : "";

    if (!nama || !tempatLahir || !tanggalLahir || !email || !nomorHP || !posisi || !jenjangPendidikan || !jurusan || !kelompokPendidikan) {
      return NextResponse.json(
        { success: false, message: "Seluruh data wajib diisi." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (!["SMA", "S1"].includes(jenjangPendidikan)) {
      return NextResponse.json(
        { success: false, message: "Pendidikan terakhir tidak valid." },
        { status: 400 }
      );
    }

    if (!["SAINTEK", "SOSHUM"].includes(kelompokPendidikan)) {
      return NextResponse.json(
        { success: false, message: "Kelompok pendidikan tidak valid." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("kandidat")
      .insert({
        nama,
        tempat_lahir: tempatLahir,
        tanggal_lahir: tanggalLahir,
        email,
        nomor_hp: nomorHP,
        posisi_dilamar: posisi,
        jenjang_pendidikan: jenjangPendidikan,
        jurusan,
        kelompok_pendidikan: kelompokPendidikan,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Gagal menyimpan kandidat:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { success: false, message: "Data kandidat belum berhasil disimpan." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      candidateId: data.id,
      message: "Data kandidat berhasil disimpan.",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Permintaan tidak valid." },
      { status: 400 }
    );
  }
}
