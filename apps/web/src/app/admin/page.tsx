"use client";

import { useEffect, useState } from "react";

interface Stats {
  userCount: number;
  taskCount: number;
  conversationCount: number;
  activeWorkflowCount: number;
  topAgents: { agent: { title: string; slug: string } | null; count: number }[];
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Ringkasan</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <p className="text-sm text-white/50">Total Pengguna</p>
          <p className="mt-1 text-3xl font-bold">{stats?.userCount ?? "-"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-white/50">Total Tugas</p>
          <p className="mt-1 text-3xl font-bold">{stats?.taskCount ?? "-"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-white/50">Total Percakapan</p>
          <p className="mt-1 text-3xl font-bold">{stats?.conversationCount ?? "-"}</p>
        </div>
        <div className="card">
          <p className="text-sm text-white/50">Workflow Aktif</p>
          <p className="mt-1 text-3xl font-bold">{stats?.activeWorkflowCount ?? "-"}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">AI Agent Paling Aktif</h2>
        <ul className="divide-y divide-white/10">
          {stats?.topAgents.map((t, i) => (
            <li key={i} className="flex justify-between py-2 text-sm">
              <span>{t.agent?.title ?? "(dihapus)"}</span>
              <span className="text-white/50">{t.count}x percakapan</span>
            </li>
          ))}
          {stats?.topAgents.length === 0 && (
            <li className="py-2 text-sm text-white/40">Belum ada data.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
