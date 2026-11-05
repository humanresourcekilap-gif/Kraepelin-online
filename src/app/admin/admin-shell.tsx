"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Timer,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  UserCog,
} from "lucide-react";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;

    let active = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth/me");
        if (!res.ok) {
          if (active) router.replace("/admin/login");
          return;
        }
        const data = await res.json();
        if (data.success && data.user) {
          if (active) {
            setAdminEmail(data.user.email);
            setAdminName(data.user.name || null);
          }
        } else {
          if (active) router.replace("/admin/login");
        }
      } catch {
        if (active) router.replace("/admin/login");
      } finally {
        if (active) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      active = false;
    };
  }, [pathname, isLoginPage, router]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  }

  // Jika sedang di halaman login, tampilkan langsung tanpa shell sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    {
      name: "Ringkasan",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      name: "Data Kandidat",
      href: "/admin/kandidat",
      icon: Users,
      active: pathname.startsWith("/admin/kandidat"),
    },
    {
      name: "Pengaturan Timer",
      href: "/admin/pengaturan",
      icon: Timer,
      active: pathname === "/admin/pengaturan",
    },
    {
      name: "Profil & Keamanan",
      href: "/admin/profil",
      icon: UserCog,
      active: pathname === "/admin/profil",
    },
  ];

  return (
    <div className="flex min-h-dvh bg-slate-50 font-sans antialiased print:min-h-0 print:bg-white">
      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden print:hidden">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/logo-kilap.png"
              alt="Logo Kilap"
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Kraepelin Admin</p>
            <p className="text-[10px] text-orange-600 font-medium">Recruiter Console</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Nav */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <Image
              src="/logo-kilap.png"
              alt="Logo Kilap"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 tracking-tight">
              Kraepelin<span className="text-orange-500">.</span>
            </p>
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Admin Console
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 space-y-1.5 px-3 py-6">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu Utama
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  item.active
                    ? "bg-orange-50 text-orange-600 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <Icon size={18} className={item.active ? "text-orange-600" : "text-slate-400"} />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-6">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Akses Cepat
            </p>
            <Link
              href="/"
              target="_blank"
              className="mt-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100/80"
            >
              <span className="flex items-center gap-3">
                <ExternalLink size={18} className="text-slate-400" />
                Halaman Tes Publik
              </span>
            </Link>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="border-t border-slate-100 p-3">
          <Link
            href="/admin/profil"
            title="Kelola Profil & Keamanan Akun"
            className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 hover:bg-orange-50/70 border border-transparent hover:border-orange-200 transition group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800 group-hover:text-orange-950 transition">
                {adminName || (loading ? "Memuat..." : "Admin Utama")}
              </p>
              <p className="truncate text-[10px] text-slate-500 font-medium">
                {adminEmail || "Hak Akses Penuh"}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={16} />
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-x-hidden pt-16 lg:pt-0 print:overflow-visible print:pt-0 print:w-full">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:w-full">{children}</main>
      </div>
    </div>
  );
}
