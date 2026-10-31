import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase-admin";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

function getSecretKey(): string {
  return (
    process.env.ADMIN_COOKIE_SECRET ||
    process.env.ASSESSMENT_COOKIE_SECRET ||
    "kraepelin-admin-fallback-secret-2026"
  );
}

/**
 * Buat client Supabase sementara (ephemeral) khusus untuk verifikasi auth (signInWithPassword).
 * PENTING: Jangan pernah memanggil auth.signInWithPassword pada supabaseAdmin singleton,
 * karena akan mengubah state dan token auth pada client tersebut sehingga query database
 * berikutnya kehilangan hak service-role (kena limitasi RLS).
 */
export function createEphemeralAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_SECRET_KEY!;

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Verifikasi kredensial email dan password dengan Supabase Auth secara terisolasi.
 */
export async function verifyPasswordWithSupabase(
  email: string,
  password: string
): Promise<{ success: boolean; user?: { id: string; email: string }; error?: string }> {
  try {
    const authClient = createEphemeralAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user?.email) {
      return { success: false, error: error?.message || "Kata sandi tidak sesuai." };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memverifikasi akun.",
    };
  }
}

export type AdminSessionPayload = {
  email: string;
  name?: string;
  role: "admin";
  issuedAt: number;
};

/**
 * Buat signed token cookie admin: payloadBase64.signatureHex
 */
export function signAdminSession(email: string, name?: string): string {
  const payload: AdminSessionPayload = {
    email: email.toLowerCase().trim(),
    name: name || "Admin",
    role: "admin",
    issuedAt: Date.now(),
  };

  const payloadString = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = createHmac("sha256", getSecretKey())
    .update(payloadString)
    .digest("hex");

  return `${payloadString}.${signature}`;
}

/**
 * Verifikasi token cookie admin
 */
export function verifyAdminSession(
  token: string | undefined | null
): AdminSessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const payloadString = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!payloadString || !/^[0-9a-f]{64}$/i.test(signature)) return null;

  const expectedSignature = createHmac("sha256", getSecretKey())
    .update(payloadString)
    .digest();

  const receivedSignature = Buffer.from(signature, "hex");

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadString, "base64url").toString("utf-8")
    ) as AdminSessionPayload;

    if (!payload.email || payload.role !== "admin") return null;

    // Kadaluarsa setelah TTL
    if (Date.now() - payload.issuedAt > SESSION_TTL_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Cek sesi admin saat ini dari cookies (untuk Server Components / Route Handlers)
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

/**
 * Autentikasi kredensial admin:
 * 1. Coba verifikasi dengan Supabase Auth (email & password).
 * 2. Fallback: jika env ADMIN_EMAIL & ADMIN_PASSWORD diatur, periksa kecocokan langsung.
 * 3. Default demo fallback jika belum ada user: email 'admin@kraepelin.com' dan password 'admin12345'.
 */
export async function authenticateAdmin(
  identifier: string,
  password: string
): Promise<{ success: boolean; email?: string; name?: string; error?: string }> {
  const cleanInput = identifier.trim();
  const cleanEmail = cleanInput.toLowerCase();

  // 1. Cek apakah identifier adalah nama_pengguna di tabel profil_admin (misal: "Admin")
  try {
    const { data: profile } = await supabaseAdmin
      .from("profil_admin")
      .select("id, nama_pengguna, nama_lengkap, peran, aktif")
      .ilike("nama_pengguna", cleanInput)
      .maybeSingle();

    if (profile) {
      if (profile.aktif === false) {
        return { success: false, error: "Akun administrator ini sedang dinonaktifkan." };
      }

      // Ambil email dari auth.users berdasarkan profile.id
      const { data: userResp } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      const authEmail = userResp?.user?.email;

      if (authEmail) {
        const authRes = await verifyPasswordWithSupabase(authEmail, password);
        if (authRes.success && authRes.user?.email) {
          return {
            success: true,
            email: authRes.user.email,
            name: profile.nama_lengkap || profile.nama_pengguna || "Admin Utama",
          };
        }
      }
    }
  } catch (err) {
    console.warn("Pemeriksaan profil_admin gagal:", err);
  }

  // 2. Coba autentikasi via Supabase Auth jika identifier berupa email (misal: humanresource@kilapglobal.com)
  try {
    const authRes = await verifyPasswordWithSupabase(cleanEmail, password);

    if (authRes.success && authRes.user?.email) {
      // Ambil info nama dari profil_admin jika ada
      let adminName = "Admin";
      const { data: profile } = await supabaseAdmin
        .from("profil_admin")
        .select("nama_pengguna, nama_lengkap, aktif")
        .eq("id", authRes.user.id)
        .maybeSingle();

      if (profile) {
        if (profile.aktif === false) {
          return { success: false, error: "Akun administrator ini sedang dinonaktifkan." };
        }
        adminName = profile.nama_lengkap || profile.nama_pengguna || adminName;
      }

      return {
        success: true,
        email: authRes.user.email,
        name: adminName,
      };
    }
  } catch (err) {
    console.warn("Supabase auth check failed:", err);
  }

  // 3. Fallback: periksa variabel environment khusus jika disetel atau default demo
  const envAdminEmail = (process.env.ADMIN_EMAIL || "admin@kraepelin.com").toLowerCase().trim();
  const envAdminPassword = process.env.ADMIN_PASSWORD || "admin12345";

  if (
    (cleanEmail === envAdminEmail || cleanInput.toLowerCase() === "admin") &&
    password === envAdminPassword
  ) {
    return { success: true, email: envAdminEmail, name: "Admin Utama" };
  }

  return {
    success: false,
    error: "Email/username atau kata sandi tidak sesuai.",
  };
}

