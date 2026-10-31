import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, signAdminSession, verifyPasswordWithSupabase } from "@/lib/server/admin-session";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ambil data user dari auth.users berdasarkan email sesi
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    let currentUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === session.email.toLowerCase()
    );

    // Jika sesi login demo fallback, hubungkan ke user admin utama di Supabase
    if (!currentUser && authUsers?.users && authUsers.users.length > 0) {
      currentUser =
        authUsers.users.find((u) => u.email?.toLowerCase() === "humanresource@kilapglobal.com") ||
        authUsers.users[0];
    }

    let profile = null;
    if (currentUser) {
      const { data: prof } = await supabaseAdmin
        .from("profil_admin")
        .select("id, nama_pengguna, nama_lengkap, peran, aktif, diperbarui_pada")
        .eq("id", currentUser.id)
        .maybeSingle();

      profile = prof;
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: currentUser?.id || null,
        email: currentUser?.email || session.email,
        nama_pengguna: profile?.nama_pengguna || session.name || "Admin",
        nama_lengkap: profile?.nama_lengkap || "Administrator Utama",
        peran: profile?.peran || "admin",
        aktif: profile?.aktif ?? true,
      },
    });
  } catch (err) {
    console.error("Gagal mengambil profil admin:", err);
    return NextResponse.json(
      { success: false, message: "Gagal memuat profil admin." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const namaPengguna = typeof body.nama_pengguna === "string" ? body.nama_pengguna.trim() : "";
    const namaLengkap = typeof body.nama_lengkap === "string" ? body.nama_lengkap.trim() : "";
    const currentPassword = typeof body.current_password === "string" ? body.current_password : "";
    const newPassword = typeof body.new_password === "string" ? body.new_password : "";

    // 1. Cari user di auth.users berdasarkan email sesi atau admin utama
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    let currentUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === session.email.toLowerCase()
    );

    // Jika sesi login demo fallback, hubungkan ke user admin utama di Supabase
    if (!currentUser && authUsers?.users && authUsers.users.length > 0) {
      currentUser =
        authUsers.users.find((u) => u.email?.toLowerCase() === "humanresource@kilapglobal.com") ||
        authUsers.users[0];
    }

    // 2. Jika ada pergantian password, verifikasi password lama terlebih dahulu
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "Kata sandi baru minimal harus 6 karakter." },
          { status: 400 }
        );
      }

      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Kata sandi saat ini wajib diisi untuk mengubah kata sandi." },
          { status: 400 }
        );
      }

      // Verifikasi kata sandi saat ini:
      // Cocokkan dengan password fallback admin12345 ATAU verifikasi langsung dengan Supabase Auth
      const envAdminPassword = process.env.ADMIN_PASSWORD || "admin12345";
      const matchesEnvPassword = currentPassword === envAdminPassword;

      let isPasswordValid = matchesEnvPassword;
      if (!isPasswordValid && currentUser?.email) {
        const verifyRes = await verifyPasswordWithSupabase(currentUser.email, currentPassword);
        isPasswordValid = verifyRes.success;
      }

      if (!isPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Kata sandi saat ini salah. Masukkan kata sandi Supabase Anda atau 'admin12345' jika menggunakan akun default.",
          },
          { status: 400 }
        );
      }

      // Perbarui kata sandi di Supabase Auth
      if (currentUser) {
        const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
          currentUser.id,
          { password: newPassword }
        );

        if (updateAuthError) {
          console.error("Gagal update password di auth.users:", updateAuthError);
          return NextResponse.json(
            { success: false, message: "Gagal memperbarui kata sandi di Supabase Auth: " + updateAuthError.message },
            { status: 500 }
          );
        }
      }
    }

    // 3. Perbarui nama_pengguna & nama_lengkap di tabel profil_admin jika ada
    let updatedDisplayName = session.name || "Admin";

    if (currentUser && (namaPengguna || namaLengkap)) {
      if (namaPengguna && namaPengguna.length < 3) {
        return NextResponse.json(
          { success: false, message: "Username minimal harus 3 karakter." },
          { status: 400 }
        );
      }

      // Pastikan username tidak dipakai oleh admin lain
      if (namaPengguna) {
        const { data: existingUser } = await supabaseAdmin
          .from("profil_admin")
          .select("id")
          .ilike("nama_pengguna", namaPengguna)
          .neq("id", currentUser.id)
          .maybeSingle();

        if (existingUser) {
          return NextResponse.json(
            { success: false, message: `Username "${namaPengguna}" sudah digunakan oleh akun lain.` },
            { status: 400 }
          );
        }
      }

      const updatePayload: Record<string, unknown> = {
        diperbarui_pada: new Date().toISOString(),
      };
      if (namaPengguna) updatePayload.nama_pengguna = namaPengguna;
      if (namaLengkap) updatePayload.nama_lengkap = namaLengkap;

      const { error: updateProfileError } = await supabaseAdmin
        .from("profil_admin")
        .update(updatePayload)
        .eq("id", currentUser.id);

      if (updateProfileError) {
        console.error("Gagal update profil_admin:", updateProfileError);
        return NextResponse.json(
          { success: false, message: "Gagal memperbarui data profil admin." },
          { status: 500 }
        );
      }

      updatedDisplayName = namaLengkap || namaPengguna || updatedDisplayName;
    }

    // 4. Perbarui token cookie admin dengan nama profil terbaru
    const newToken = signAdminSession(session.email, updatedDisplayName);

    const response = NextResponse.json({
      success: true,
      message: newPassword
        ? "Username, profil, dan kata sandi berhasil diperbarui!"
        : "Username dan profil admin berhasil diperbarui!",
      user: {
        email: session.email,
        name: updatedDisplayName,
        role: "admin",
      },
    });

    response.cookies.set("admin_session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 jam
    });

    return response;
  } catch (err) {
    console.error("Gagal memproses update profil admin:", err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}

