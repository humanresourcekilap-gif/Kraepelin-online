"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  User,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Mail,
  BadgeCheck,
} from "lucide-react";

type ProfileData = {
  id: string | null;
  email: string;
  nama_pengguna: string;
  nama_lengkap: string;
  peran: string;
  aktif: boolean;
};

export default function AdminProfilPage() {
  const [profile, setProfile] = useState<ProfileData>({
    id: null,
    email: "",
    nama_pengguna: "Admin",
    nama_lengkap: "Admin Utama",
    peran: "admin",
    aktif: true,
  });

  const [loading, setLoading] = useState(true);

  // Form State: Username & Profil
  const [namaPengguna, setNamaPengguna] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form State: Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/admin/auth/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile) {
            setProfile(data.profile);
            setNamaPengguna(data.profile.nama_pengguna || "");
            setNamaLengkap(data.profile.nama_lengkap || "");
          }
        }
      } catch (err) {
        console.error("Gagal memuat profil admin:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Handler: Update Username & Profil
  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    if (namaPengguna.trim().length < 3) {
      setProfileMessage({
        type: "error",
        text: "Username minimal harus 3 karakter.",
      });
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_pengguna: namaPengguna.trim(),
          nama_lengkap: namaLengkap.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setProfileMessage({
          type: "error",
          text: data.message || "Gagal memperbarui username & profil.",
        });
      } else {
        setProfileMessage({
          type: "success",
          text: data.message || "Username & profil berhasil diperbarui!",
        });
        setProfile((prev) => ({
          ...prev,
          nama_pengguna: namaPengguna.trim(),
          nama_lengkap: namaLengkap.trim(),
        }));
      }
    } catch {
      setProfileMessage({
        type: "error",
        text: "Terjadi kesalahan jaringan saat memperbarui profil.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  // Handler: Update Password
  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Kata sandi saat ini wajib diisi.",
      });
      setSavingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Kata sandi baru minimal harus 6 karakter.",
      });
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Konfirmasi kata sandi baru tidak cocok.",
      });
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasswordMessage({
          type: "error",
          text: data.message || "Gagal memperbarui kata sandi.",
        });
      } else {
        setPasswordMessage({
          type: "success",
          text: "Kata sandi berhasil diperbarui! Gunakan kata sandi baru untuk login berikutnya.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Terjadi kesalahan jaringan saat mengubah kata sandi.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
          <p className="text-xs text-slate-500">Memuat profil administrator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Profil & Keamanan Akun
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola nama pengguna (username), profil, dan kata sandi login administrator
        </p>
      </div>

      {/* Info Badge Akun Aktif */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-white p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {profile.nama_lengkap || profile.nama_pengguna || "Admin Utama"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <BadgeCheck size={12} />
                Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Username: <strong className="text-slate-800">@{profile.nama_pengguna}</strong> · Email:{" "}
              <strong className="text-slate-800">{profile.email}</strong>
            </p>
          </div>
        </div>

        <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
          Peran: <strong className="text-orange-600 uppercase">{profile.peran}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Ubah Username & Profil */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Username & Informasi Profil
              </h3>
              <p className="text-xs text-slate-500">
                Atur nama tampilan dan username untuk login
              </p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                profileMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {profileMessage.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Username (Nama Pengguna)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  required
                  minLength={3}
                  value={namaPengguna}
                  onChange={(e) => setNamaPengguna(e.target.value)}
                  placeholder="Contoh: Admin"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Username dapat digunakan langsung pada form login admin.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Nama Lengkap Administrator
              </label>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Contoh: Admin Utama"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Email Login Supabase (Terhubung)
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={profile.email}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 pr-4 pl-10 text-xs font-mono text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 active:scale-95 disabled:opacity-50 transition"
            >
              <Save size={15} />
              {savingProfile ? "Menyimpan Perubahan..." : "Simpan Perubahan Username"}
            </button>
          </form>
        </div>

        {/* Card 2: Ubah Kata Sandi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ubah Kata Sandi (Password)
              </h3>
              <p className="text-xs text-slate-500">
                Perbarui kata sandi akun Supabase Auth Anda
              </p>
            </div>
          </div>

          {passwordMessage && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
                passwordMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {passwordMessage.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Password Saat Ini */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Kata Sandi Saat Ini
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Gunakan kata sandi akun Supabase Anda, atau <code className="rounded bg-slate-100 px-1 py-0.5 font-mono font-bold text-slate-700">admin12345</code> jika saat login menggunakan akun demo default.
              </p>
            </div>

            {/* Password Baru */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Kata Sandi Baru (Min. 6 Karakter)
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password Baru */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition"
            >
              <KeyRound size={15} />
              {savingPassword ? "Memperbarui Kata Sandi..." : "Perbarui Kata Sandi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

