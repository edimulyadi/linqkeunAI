"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mendaftar");
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
          <h1 className="mb-6 text-xl font-semibold">Buat akun baru</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              required
              placeholder="Nama lengkap"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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
              minLength={8}
              placeholder="Kata sandi (min. 8 karakter)"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-white/60">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-brand-400 hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
