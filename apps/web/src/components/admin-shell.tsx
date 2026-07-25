"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/dashboard-shell";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/60">
        Memuat...
      </div>
    );
  }
  if (!user) return null;
  if (user.role !== "ADMIN") {
    router.replace("/dashboard");
    return null;
  }

  const links = [
    { href: "/admin", label: "Ringkasan" },
    { href: "/admin/tools", label: "Karyawan AI" },
    { href: "/admin/users", label: "Pengguna" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-bold">
            linqkeun<span className="text-brand-400">AI</span>{" "}
            <span className="text-white/40">/ admin</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href
                    ? "text-brand-400"
                    : "text-white/70 hover:text-brand-300"
                }
              >
                {l.label}
              </Link>
            ))}
            <Link href="/dashboard" className="text-white/50 hover:text-white">
              Keluar dari admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
