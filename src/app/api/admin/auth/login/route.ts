import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, signAdminSession } from "@/lib/server/admin-session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier =
      (typeof body.identifier === "string" && body.identifier.trim()) ||
      (typeof body.email === "string" && body.email.trim()) ||
      "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Email atau username serta kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const authResult = await authenticateAdmin(identifier, password);

    if (!authResult.success || !authResult.email) {
      return NextResponse.json(
        {
          success: false,
          message: authResult.error || "Email atau kata sandi tidak sesuai.",
        },
        { status: 401 }
      );
    }

    const token = signAdminSession(authResult.email, authResult.name);

    const response = NextResponse.json({
      success: true,
      message: "Berhasil masuk ke Dashboard Admin.",
      user: {
        email: authResult.email,
        name: authResult.name || "Admin Utama",
        role: "admin",
      },
    });

    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 jam
    });

    return response;
  } catch (error) {
    console.error("Gagal login admin:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}

