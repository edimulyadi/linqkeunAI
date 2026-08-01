"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  slug: string;
  name: string;
  roleType: string;
  title: string;
  description: string;
  systemPrompt: string;
  skills: string[];
  tools: string[];
  color: string;
  avatarIcon: string;
  isActive: boolean;
}

const AVAILABLE_TOOLS = [
  "get_business_metrics",
  "list_tasks",
  "create_task",
  "search_knowledge_base",
  "delegate_to_agent",
];
const ROLE_TYPES = ["CEO", "FINANCE", "HR", "MARKETING", "OPERATIONS", "CUSTOM"];

const emptyDraft = {
  slug: "",
  name: "",
  roleType: "CUSTOM",
  title: "",
  description: "",
  systemPrompt: "",
  skills: "",
  tools: [] as string[],
  color: "#f0b429",
  avatarIcon: "bot",
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [creating, setCreating] = useState<typeof emptyDraft | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/agents")
      .then((res) => res.json())
      .then((data) => setAgents(data.agents ?? []));
  }

  useEffect(load, []);

  async function toggleActive(agent: Agent) {
    await fetch(`/api/admin/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    load();
  }

  function toggleTool(list: string[], tool: string): string[] {
    return list.includes(tool) ? list.filter((t) => t !== tool) : [...list, tool];
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/agents/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editing.title,
          description: editing.description,
          systemPrompt: editing.systemPrompt,
          skills: editing.skills,
          tools: editing.tools,
          color: editing.color,
        }),
      });
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function saveCreate() {
    if (!creating) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...creating,
          skills: creating.skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setCreating(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kelola AI Agents</h1>
        <button className="btn-primary" onClick={() => setCreating(emptyDraft)}>
          + Agent Baru
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-white/50">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Peran</th>
              <th className="py-2 pr-4">Tools</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="py-2 pr-4 font-medium">{a.title}</td>
                <td className="py-2 pr-4 text-white/60">{a.roleType}</td>
                <td className="py-2 pr-4 text-white/60">{a.tools.length}</td>
                <td className="py-2 pr-4">
                  <button
                    onClick={() => toggleActive(a)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      a.isActive ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {a.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <button onClick={() => setEditing(a)} className="text-brand-400 hover:underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="card max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto">
            <h2 className="text-lg font-semibold">Edit: {editing.title}</h2>
            <div>
              <label className="mb-1 block text-xs text-white/60">Judul</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Deskripsi</label>
              <textarea
                className="input h-16 resize-none"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Skills (pisahkan koma)</label>
              <input
                className="input"
                value={editing.skills.join(", ")}
                onChange={(e) =>
                  setEditing({ ...editing, skills: e.target.value.split(",").map((s) => s.trim()) })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Tools yang boleh dipakai</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <button
                    type="button"
                    key={tool}
                    onClick={() => setEditing({ ...editing, tools: toggleTool(editing.tools, tool) })}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      editing.tools.includes(tool)
                        ? "border-brand-400 bg-brand-400/15 text-brand-300"
                        : "border-white/15 text-white/50"
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">System Prompt (AI)</label>
              <textarea
                className="input h-40 resize-none font-mono text-xs"
                value={editing.systemPrompt}
                onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setEditing(null)}>
                Batal
              </button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="card max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto">
            <h2 className="text-lg font-semibold">Agent Baru</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">Slug</label>
                <input
                  className="input"
                  placeholder="legal-ai"
                  value={creating.slug}
                  onChange={(e) => setCreating({ ...creating, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Peran</label>
                <select
                  className="input"
                  value={creating.roleType}
                  onChange={(e) => setCreating({ ...creating, roleType: e.target.value })}
                >
                  {ROLE_TYPES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Nama</label>
              <input
                className="input"
                placeholder="Legal AI"
                value={creating.name}
                onChange={(e) => setCreating({ ...creating, name: e.target.value, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Deskripsi</label>
              <textarea
                className="input h-16 resize-none"
                value={creating.description}
                onChange={(e) => setCreating({ ...creating, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Skills (pisahkan koma)</label>
              <input
                className="input"
                value={creating.skills}
                onChange={(e) => setCreating({ ...creating, skills: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">Tools</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <button
                    type="button"
                    key={tool}
                    onClick={() => setCreating({ ...creating, tools: toggleTool(creating.tools, tool) })}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      creating.tools.includes(tool)
                        ? "border-brand-400 bg-brand-400/15 text-brand-300"
                        : "border-white/15 text-white/50"
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">System Prompt</label>
              <textarea
                className="input h-32 resize-none font-mono text-xs"
                value={creating.systemPrompt}
                onChange={(e) => setCreating({ ...creating, systemPrompt: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setCreating(null)}>
                Batal
              </button>
              <button
                className="btn-primary"
                onClick={saveCreate}
                disabled={saving || !creating.slug || !creating.title}
              >
                {saving ? "Menyimpan..." : "Buat Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
