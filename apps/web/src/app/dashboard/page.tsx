"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportsData {
  metrics: Record<string, { period: string; value: number }[]>;
  taskStats: { total: number; byStatus: Record<string, number> };
  agentUtilization: { agentSlug: string; title: string; color: string; taskCount: number }[];
}

interface Analysis {
  headline: string;
  insights: string[];
  recommendedAction: string;
  watchAgentSlug: string;
}

interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: string;
  user: { name: string } | null;
  agent: { title: string; avatarIcon: string; color: string } | null;
}

function formatRupiah(millions: number) {
  return `Rp ${millions.toLocaleString("id-ID")} juta`;
}

function last(series?: { period: string; value: number }[]) {
  return series && series.length ? series[series.length - 1] : undefined;
}
function prev(series?: { period: string; value: number }[]) {
  return series && series.length > 1 ? series[series.length - 2] : undefined;
}

function DeltaBadge({ current, previous }: { current?: number; previous?: number }) {
  if (current === undefined || previous === undefined || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then(setReports);
    fetch("/api/activity")
      .then((res) => res.json())
      .then((d) => setLogs(d.logs ?? []));
    fetch("/api/ai/analyze", { method: "POST" })
      .then((res) => res.json())
      .then((d) => setAnalysis(d.analysis ?? null))
      .finally(() => setAnalysisLoading(false));
  }, []);

  const revenue = reports?.metrics.revenue;
  const expenses = reports?.metrics.expenses;
  const customers = reports?.metrics.customers;
  const openTasks = (reports?.taskStats.byStatus.TODO ?? 0) + (reports?.taskStats.byStatus.IN_PROGRESS ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-white/60">Ringkasan performa bisnis dan tim AI co-worker Anda.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-white/50">Pendapatan Bulan Ini</p>
          <p className="mt-1 text-2xl font-bold">{last(revenue) ? formatRupiah(last(revenue)!.value) : "-"}</p>
          <DeltaBadge current={last(revenue)?.value} previous={prev(revenue)?.value} />
        </div>
        <div className="card">
          <p className="text-sm text-white/50">Pengeluaran Bulan Ini</p>
          <p className="mt-1 text-2xl font-bold">{last(expenses) ? formatRupiah(last(expenses)!.value) : "-"}</p>
          <DeltaBadge current={last(expenses)?.value} previous={prev(expenses)?.value} />
        </div>
        <div className="card">
          <p className="text-sm text-white/50">Pelanggan Baru</p>
          <p className="mt-1 text-2xl font-bold">{last(customers)?.value ?? "-"}</p>
          <DeltaBadge current={last(customers)?.value} previous={prev(customers)?.value} />
        </div>
        <div className="card">
          <p className="text-sm text-white/50">Tugas Terbuka</p>
          <p className="mt-1 text-2xl font-bold">{openTasks}</p>
          <Link href="/dashboard/tasks" className="text-xs text-brand-400 hover:underline">
            Lihat semua tugas →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <span className="text-brand-400">✦</span> AI Insights
          </h2>
          {analysisLoading ? (
            <p className="text-sm text-white/40">Menganalisis data bisnis...</p>
          ) : analysis ? (
            <div className="space-y-3">
              <p className="font-medium">{analysis.headline}</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-white/70">
                {analysis.insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
              <div className="rounded-lg border border-brand-400/20 bg-brand-400/5 p-3 text-sm">
                <span className="font-semibold text-brand-300">Rekomendasi: </span>
                {analysis.recommendedAction}
              </div>
              <Link
                href={`/dashboard/chat/${analysis.watchAgentSlug}`}
                className="inline-block text-xs text-brand-400 hover:underline"
              >
                Bahas lebih lanjut dengan {analysis.watchAgentSlug} →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-white/40">Insight belum tersedia.</p>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Aktivitas Terbaru</h2>
          <ul className="space-y-3">
            {logs.slice(0, 8).map((log) => (
              <li key={log.id} className="text-xs">
                <p className="text-white/80">
                  <span className="font-medium">{log.agent?.title ?? log.user?.name ?? "Sistem"}</span>{" "}
                  <span className="text-white/50">{describeAction(log.action)}</span>
                </p>
                <p className="text-white/30">{new Date(log.createdAt).toLocaleString("id-ID")}</p>
              </li>
            ))}
            {logs.length === 0 && <li className="text-xs text-white/40">Belum ada aktivitas.</li>}
          </ul>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Tim AI Co-Worker</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reports?.agentUtilization.map((a) => (
            <Link
              key={a.agentSlug}
              href={`/dashboard/chat/${a.agentSlug}`}
              className="rounded-xl border border-white/10 p-3 transition hover:border-brand-400/40"
            >
              <p className="font-semibold" style={{ color: a.color }}>
                {a.title}
              </p>
              <p className="mt-1 text-xs text-white/50">{a.taskCount} tugas ditugaskan</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function describeAction(action: string) {
  const map: Record<string, string> = {
    "task.created": "membuat tugas",
    "task.created_by_ai": "membuat tugas otomatis",
    "task.updated": "memperbarui tugas",
    "task.completed_by_ai": "menyelesaikan tugas",
    "agent.chat": "melakukan percakapan",
    "agent.orchestrate": "berkonsultasi dengan tim AI",
    "workflow.triggered": "memicu automasi workflow",
  };
  return map[action] ?? action;
}
