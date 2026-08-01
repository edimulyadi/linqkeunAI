"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ReportsData {
  metrics: Record<string, { period: string; value: number }[]>;
  taskStats: { total: number; byStatus: Record<string, number> };
  agentUtilization: { agentSlug: string; title: string; color: string; taskCount: number; conversationCount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#f0b429",
  DONE: "#34d399",
  BLOCKED: "#f87171",
};

function mergeSeries(revenue: { period: string; value: number }[] = [], expenses: { period: string; value: number }[] = []) {
  const periods = Array.from(new Set([...revenue.map((r) => r.period), ...expenses.map((e) => e.period)])).sort();
  return periods.map((period) => ({
    period,
    Pendapatan: revenue.find((r) => r.period === period)?.value ?? 0,
    Pengeluaran: expenses.find((e) => e.period === period)?.value ?? 0,
  }));
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-white/60">Memuat laporan...</p>;

  const financeSeries = mergeSeries(data.metrics.revenue, data.metrics.expenses);
  const taskStatusData = Object.entries(data.taskStats.byStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-white/60">Laporan otomatis dari data yang tercatat di sistem.</p>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Pendapatan vs Pengeluaran (juta Rp)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={financeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
            <XAxis dataKey="period" stroke="#ffffff66" fontSize={12} />
            <YAxis stroke="#ffffff66" fontSize={12} />
            <Tooltip contentStyle={{ background: "#151517", border: "1px solid #ffffff22" }} />
            <Legend />
            <Line type="monotone" dataKey="Pendapatan" stroke="#f0b429" strokeWidth={2} />
            <Line type="monotone" dataKey="Pengeluaran" stroke="#f87171" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Status Tugas</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={taskStatusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {taskStatusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#f0b429"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#151517", border: "1px solid #ffffff22" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Utilisasi AI Agent</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.agentUtilization}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
              <XAxis dataKey="title" stroke="#ffffff66" fontSize={11} />
              <YAxis stroke="#ffffff66" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#151517", border: "1px solid #ffffff22" }} />
              <Legend />
              <Bar dataKey="taskCount" name="Tugas" fill="#f0b429" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversationCount" name="Percakapan" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.metrics.customers && (
        <div className="card">
          <h2 className="mb-4 font-semibold">Pelanggan Baru per Bulan</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.metrics.customers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
              <XAxis dataKey="period" stroke="#ffffff66" fontSize={12} />
              <YAxis stroke="#ffffff66" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#151517", border: "1px solid #ffffff22" }} />
              <Bar dataKey="value" name="Pelanggan Baru" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
