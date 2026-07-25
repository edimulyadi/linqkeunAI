"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

export function useCurrentUser() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/60">
        Memuat...
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-bold">
            linqkeun<span className="text-brand-400">AI</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className={`hover:text-brand-300 ${
                pathname === "/dashboard" ? "text-brand-400" : "text-white/70"
              }`}
            >
              Karyawan AI
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin" className="text-white/70 hover:text-brand-300">
                Admin
              </Link>
            )}
            <span className="text-white/50">{user.name}</span>
            <button onClick={logout} className="btn-secondary px-3 py-1.5 text-xs">
              Keluar
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
