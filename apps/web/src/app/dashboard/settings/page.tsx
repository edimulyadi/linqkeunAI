"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  slug: string;
  title: string;
  color: string;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  createdByUser: { name: string };
}

interface WorkflowRun {
  id: string;
  status: "TRIGGERED" | "SKIPPED" | "FAILED";
  summary: string;
  createdAt: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: "METRIC_THRESHOLD" | "MANUAL" | "SCHEDULE";
  triggerConfig: { metricKey?: string; comparator?: string; value?: number };
  actionType: "CREATE_TASK" | "RUN_AGENT";
  actionConfig: { taskTitle?: string; taskDescription?: string; prompt?: string };
  isActive: boolean;
  targetAgent: { slug: string; title: string; color: string } | null;
  runs: WorkflowRun[];
}

const INTEGRATIONS = [
  { provider: "WHATSAPP", label: "WhatsApp Business" },
  { provider: "EMAIL", label: "Email" },
  { provider: "GOOGLE_SHEETS", label: "Google Sheets" },
  { provider: "CRM", label: "CRM" },
];

const emptyKb = { title: "", content: "", category: "general" };
const emptyWorkflow = {
  name: "",
  description: "",
  triggerType: "METRIC_THRESHOLD" as Workflow["triggerType"],
  metricKey: "revenue",
  comparator: "drop_percent",
  thresholdValue: 10,
  actionType: "CREATE_TASK" as Workflow["actionType"],
  taskTitle: "",
  taskDescription: "",
  prompt: "",
  targetAgentId: "",
};

export default function SettingsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [kbEntries, setKbEntries] = useState<KnowledgeEntry[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [kbDraft, setKbDraft] = useState<typeof emptyKb | null>(null);
  const [wfDraft, setWfDraft] = useState<typeof emptyWorkflow | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  function loadAll() {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents ?? []));
    fetch("/api/knowledge").then((r) => r.json()).then((d) => setKbEntries(d.entries ?? []));
    fetch("/api/workflows").then((r) => r.json()).then((d) => setWorkflows(d.workflows ?? []));
  }

  useEffect(loadAll, []);

  async function saveKb() {
    if (!kbDraft || !kbDraft.title.trim() || !kbDraft.content.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kbDraft),
      });
      setKbDraft(null);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteKb(id: string) {
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function saveWorkflow() {
    if (!wfDraft || !wfDraft.name.trim() || !wfDraft.description.trim()) return;
    setSaving(true);
    try {
      const triggerConfig =
        wfDraft.triggerType === "METRIC_THRESHOLD"
          ? { metricKey: wfDraft.metricKey, comparator: wfDraft.comparator, value: wfDraft.thresholdValue }
          : {};
      const actionConfig =
        wfDraft.actionType === "CREATE_TASK"
          ? { taskTitle: wfDraft.taskTitle, taskDescription: wfDraft.taskDescription }
          : { prompt: wfDraft.prompt };
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wfDraft.name,
          description: wfDraft.description,
          triggerType: wfDraft.triggerType,
          triggerConfig,
          actionType: wfDraft.actionType,
          actionConfig,
          targetAgentId: wfDraft.targetAgentId || undefined,
        }),
      });
      setWfDraft(null);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function toggleWorkflow(wf: Workflow) {
    await fetch(`/api/workflows/${wf.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !wf.isActive }),
    });
    loadAll();
  }

  async function deleteWorkflow(id: string) {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function runWorkflow(id: string) {
    setRunningId(id);
    try {
      await fetch(`/api/workflows/${id}/run`, { method: "POST" });
      loadAll();
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-white/60">Knowledge base, automasi workflow, dan integrasi.</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <button className="btn-secondary text-sm" onClick={() => setKbDraft(emptyKb)}>
            + Tambah Entri
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {kbEntries.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-400">{e.category}</p>
                  <h3 className="font-semibold">{e.title}</h3>
                </div>
                <button onClick={() => deleteKb(e.id)} className="text-xs text-red-400/80 hover:underline">
                  Hapus
                </button>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-white/60">{e.content}</p>
            </div>
          ))}
          {kbEntries.length === 0 && <p className="text-sm text-white/40">Belum ada entri knowledge base.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workflow Automation</h2>
          <button className="btn-secondary text-sm" onClick={() => setWfDraft(emptyWorkflow)}>
            + Aturan Baru
          </button>
        </div>
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div key={wf.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{wf.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        wf.isActive ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {wf.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/60">{wf.description}</p>
                  <p className="mt-1 text-xs text-white/40">
                    JIKA {wf.triggerType === "METRIC_THRESHOLD"
                      ? `${wf.triggerConfig.metricKey} ${wf.triggerConfig.comparator} ${wf.triggerConfig.value}`
                      : wf.triggerType}{" "}
                    → {wf.actionType === "CREATE_TASK" ? "buat tugas" : "jalankan agent"}
                    {wf.targetAgent && (
                      <span style={{ color: wf.targetAgent.color }}> untuk {wf.targetAgent.title}</span>
                    )}
                  </p>
                  {wf.runs[0] && (
                    <p className="mt-2 text-xs text-white/50">
                      Terakhir dijalankan: <span className="font-medium">{wf.runs[0].status}</span> —{" "}
                      {wf.runs[0].summary}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                  <button onClick={() => runWorkflow(wf.id)} disabled={runningId === wf.id} className="text-brand-400 hover:underline">
                    {runningId === wf.id ? "Menjalankan..." : "Jalankan Sekarang"}
                  </button>
                  <button onClick={() => toggleWorkflow(wf)} className="text-white/60 hover:underline">
                    {wf.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button onClick={() => deleteWorkflow(wf.id)} className="text-red-400/80 hover:underline">
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
          {workflows.length === 0 && <p className="text-sm text-white/40">Belum ada aturan workflow.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Integrasi</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATIONS.map((i) => (
            <div key={i.provider} className="card">
              <p className="font-semibold">{i.label}</p>
              <p className="mt-1 text-xs text-white/50">Belum terhubung</p>
              <button className="btn-secondary mt-3 w-full text-xs" disabled title="Butuh kredensial API pihak ketiga">
                Hubungkan
              </button>
            </div>
          ))}
        </div>
      </section>

      {kbDraft && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4">
          <div className="card w-full max-w-lg space-y-3">
            <h2 className="text-lg font-semibold">Entri Knowledge Base Baru</h2>
            <input
              className="input"
              placeholder="Judul"
              value={kbDraft.title}
              onChange={(e) => setKbDraft({ ...kbDraft, title: e.target.value })}
            />
            <input
              className="input"
              placeholder="Kategori (general, finance, marketing, hr, ...)"
              value={kbDraft.category}
              onChange={(e) => setKbDraft({ ...kbDraft, category: e.target.value })}
            />
            <textarea
              className="input h-32 resize-none"
              placeholder="Isi konten"
              value={kbDraft.content}
              onChange={(e) => setKbDraft({ ...kbDraft, content: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setKbDraft(null)}>
                Batal
              </button>
              <button className="btn-primary" onClick={saveKb} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {wfDraft && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="card max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto">
            <h2 className="text-lg font-semibold">Aturan Workflow Baru</h2>
            <input
              className="input"
              placeholder="Nama aturan"
              value={wfDraft.name}
              onChange={(e) => setWfDraft({ ...wfDraft, name: e.target.value })}
            />
            <textarea
              className="input h-16 resize-none"
              placeholder="Deskripsi"
              value={wfDraft.description}
              onChange={(e) => setWfDraft({ ...wfDraft, description: e.target.value })}
            />

            <div>
              <label className="mb-1 block text-xs text-white/60">Trigger</label>
              <select
                className="input"
                value={wfDraft.triggerType}
                onChange={(e) => setWfDraft({ ...wfDraft, triggerType: e.target.value as Workflow["triggerType"] })}
              >
                <option value="METRIC_THRESHOLD">Ambang batas metrik</option>
                <option value="MANUAL">Manual saja</option>
                <option value="SCHEDULE">Terjadwal (dijalankan scheduler)</option>
              </select>
            </div>

            {wfDraft.triggerType === "METRIC_THRESHOLD" && (
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="input"
                  value={wfDraft.metricKey}
                  onChange={(e) => setWfDraft({ ...wfDraft, metricKey: e.target.value })}
                >
                  <option value="revenue">revenue</option>
                  <option value="expenses">expenses</option>
                  <option value="customers">customers</option>
                  <option value="tasksCompleted">tasksCompleted</option>
                </select>
                <select
                  className="input"
                  value={wfDraft.comparator}
                  onChange={(e) => setWfDraft({ ...wfDraft, comparator: e.target.value })}
                >
                  <option value="drop_percent">turun %</option>
                  <option value="rise_percent">naik %</option>
                  <option value="below">di bawah nilai</option>
                  <option value="above">di atas nilai</option>
                </select>
                <input
                  type="number"
                  className="input"
                  value={wfDraft.thresholdValue}
                  onChange={(e) => setWfDraft({ ...wfDraft, thresholdValue: Number(e.target.value) })}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-white/60">Aksi</label>
              <select
                className="input"
                value={wfDraft.actionType}
                onChange={(e) => setWfDraft({ ...wfDraft, actionType: e.target.value as Workflow["actionType"] })}
              >
                <option value="CREATE_TASK">Buat tugas</option>
                <option value="RUN_AGENT">Jalankan agent sekarang</option>
              </select>
            </div>

            {wfDraft.actionType === "CREATE_TASK" ? (
              <>
                <input
                  className="input"
                  placeholder="Judul tugas"
                  value={wfDraft.taskTitle}
                  onChange={(e) => setWfDraft({ ...wfDraft, taskTitle: e.target.value })}
                />
                <textarea
                  className="input h-20 resize-none"
                  placeholder="Deskripsi tugas"
                  value={wfDraft.taskDescription}
                  onChange={(e) => setWfDraft({ ...wfDraft, taskDescription: e.target.value })}
                />
              </>
            ) : (
              <textarea
                className="input h-20 resize-none"
                placeholder="Instruksi untuk agent"
                value={wfDraft.prompt}
                onChange={(e) => setWfDraft({ ...wfDraft, prompt: e.target.value })}
              />
            )}

            <div>
              <label className="mb-1 block text-xs text-white/60">Agent target</label>
              <select
                className="input"
                value={wfDraft.targetAgentId}
                onChange={(e) => setWfDraft({ ...wfDraft, targetAgentId: e.target.value })}
              >
                <option value="">Tidak ada</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setWfDraft(null)}>
                Batal
              </button>
              <button className="btn-primary" onClick={saveWorkflow} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Aturan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
