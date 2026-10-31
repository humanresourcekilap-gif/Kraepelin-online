import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/server/admin-session";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Belum terautentikasi." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      email: session.email,
      name: session.name || "Admin Utama",
      role: session.role,
    },
  });
}

