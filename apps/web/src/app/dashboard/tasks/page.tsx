"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  slug: string;
  title: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  result: string | null;
  assignedAgent: { slug: string; title: string; color: string } | null;
  assignedUser: { id: string; name: string } | null;
  createdByUser: { id: string; name: string };
}

const STATUSES: Task["status"][] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
const STATUS_LABEL: Record<Task["status"], string> = {
  TODO: "Belum Dikerjakan",
  IN_PROGRESS: "Sedang Berjalan",
  DONE: "Selesai",
  BLOCKED: "Terhambat",
};
const PRIORITY_COLOR: Record<Task["priority"], string> = {
  LOW: "text-white/50",
  MEDIUM: "text-brand-300",
  HIGH: "text-orange-400",
  URGENT: "text-red-400",
};

const emptyDraft = {
  title: "",
  description: "",
  priority: "MEDIUM" as Task["priority"],
  assignedAgentId: "",
  dueDate: "",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filter, setFilter] = useState<Task["status"] | "ALL">("ALL");
  const [creating, setCreating] = useState<typeof emptyDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  function load() {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data.tasks ?? []));
  }

  useEffect(() => {
    load();
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => setAgents(data.agents ?? []));
  }, []);

  async function updateStatus(task: Task, status: Task["status"]) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function runWithAgent(task: Task) {
    setRunningId(task.id);
    try {
      await fetch(`/api/tasks/${task.id}/run`, { method: "POST" });
      load();
    } finally {
      setRunningId(null);
    }
  }

  async function deleteTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    load();
  }

  async function createTask() {
    if (!creating || !creating.title.trim() || !creating.description.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: creating.title,
          description: creating.description,
          priority: creating.priority,
          assignedAgentId: creating.assignedAgentId || undefined,
          dueDate: creating.dueDate || undefined,
        }),
      });
      setCreating(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  const visibleTasks = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="mt-1 text-white/60">Tugaskan pekerjaan ke AI agent atau anggota tim.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(emptyDraft)}>
          + Tugas Baru
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 ${
              filter === s ? "border-brand-400 bg-brand-400/15 text-brand-300" : "border-white/15 text-white/60"
            }`}
          >
            {s === "ALL" ? "Semua" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleTasks.map((task) => (
          <div key={task.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{task.title}</h3>
                  <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                </div>
                <p className="mt-1 text-sm text-white/60">{task.description}</p>
                {task.result && (
                  <div className="mt-2 rounded-lg border border-brand-400/20 bg-brand-400/5 p-3 text-sm text-white/80">
                    <span className="font-semibold text-brand-300">Hasil AI: </span>
                    {task.result}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
                  {task.assignedAgent && (
                    <span style={{ color: task.assignedAgent.color }}>● {task.assignedAgent.title}</span>
                  )}
                  {task.assignedUser && <span>● {task.assignedUser.name}</span>}
                  {!task.assignedAgent && !task.assignedUser && <span>Belum ditugaskan</span>}
                  {task.dueDate && <span>Jatuh tempo: {new Date(task.dueDate).toLocaleDateString("id-ID")}</span>}
                  <span>Dibuat oleh {task.createdByUser.name}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <select
                  className="input w-auto py-1 text-xs"
                  value={task.status}
                  onChange={(e) => updateStatus(task, e.target.value as Task["status"])}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  {task.assignedAgent && task.status !== "DONE" && (
                    <button
                      onClick={() => runWithAgent(task)}
                      disabled={runningId === task.id}
                      className="text-xs text-brand-400 hover:underline"
                    >
                      {runningId === task.id ? "Mengerjakan..." : "Kerjakan dengan AI"}
                    </button>
                  )}
                  <button onClick={() => deleteTask(task)} className="text-xs text-red-400/80 hover:underline">
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {visibleTasks.length === 0 && <p className="text-sm text-white/40">Tidak ada tugas di kategori ini.</p>}
      </div>

      {creating && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4">
          <div className="card w-full max-w-lg space-y-3">
            <h2 className="text-lg font-semibold">Tugas Baru</h2>
            <div>
              <label className="mb-1 block text-xs text-white/60">Judul</label>
              <input
                className="input"
                value={creating.title}
                onChange={(e) => setCreating({ ...creating, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Deskripsi</label>
              <textarea
                className="input h-24 resize-none"
                value={creating.description}
                onChange={(e) => setCreating({ ...creating, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">Prioritas</label>
                <select
                  className="input"
                  value={creating.priority}
                  onChange={(e) => setCreating({ ...creating, priority: e.target.value as Task["priority"] })}
                >
                  {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Jatuh Tempo</label>
                <input
                  type="date"
                  className="input"
                  value={creating.dueDate}
                  onChange={(e) => setCreating({ ...creating, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Tugaskan ke AI Agent</label>
              <select
                className="input"
                value={creating.assignedAgentId}
                onChange={(e) => setCreating({ ...creating, assignedAgentId: e.target.value })}
              >
                <option value="">Belum ditugaskan</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setCreating(null)}>
                Batal
              </button>
              <button className="btn-primary" onClick={createTask} disabled={saving}>
                {saving ? "Menyimpan..." : "Buat Tugas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
