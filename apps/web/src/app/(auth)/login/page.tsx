"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal masuk");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-2xl font-bold">
          linqkeun<span className="text-brand-400">AI</span>
        </div>
        <div className="card">
          <h1 className="mb-6 text-xl font-semibold">Masuk ke akun Anda</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              placeholder="Kata sandi"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-white/60">
            Belum punya akun?{" "}
            <Link href="/register" className="text-brand-400 hover:underline">
              Daftar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
