"use client";

import { useEffect, useState } from "react";

interface Tool {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string;
  kind: string;
  systemPrompt: string;
  priceRupiah: number;
  isActive: boolean;
  category: { title: string };
}

export default function AdminToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/admin/tools")
      .then((res) => res.json())
      .then((data) => setTools(data.tools ?? []));
  }

  useEffect(load, []);

  async function toggleActive(tool: Tool) {
    await fetch(`/api/admin/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tool.isActive }),
    });
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/tools/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editing.title,
          description: editing.description,
          systemPrompt: editing.systemPrompt,
          priceRupiah: editing.priceRupiah,
        }),
      });
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kelola Karyawan AI</h1>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-white/50">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4">Kode</th>
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Kategori</th>
              <th className="py-2 pr-4">Jenis</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {tools.map((t) => (
              <tr key={t.id}>
                <td className="py-2 pr-4 text-white/60">{t.code}</td>
                <td className="py-2 pr-4 font-medium">{t.title}</td>
                <td className="py-2 pr-4 text-white/60">{t.category.title}</td>
                <td className="py-2 pr-4 text-white/60">{t.kind}</td>
                <td className="py-2 pr-4">
                  <button
                    onClick={() => toggleActive(t)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.isActive
                        ? "bg-green-500/15 text-green-400"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {t.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="py-2 pr-4">
                  <button
                    onClick={() => setEditing(t)}
                    className="text-brand-400 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 px-4">
          <div className="card w-full max-w-lg space-y-3">
            <h2 className="text-lg font-semibold">Edit: {editing.code}</h2>
            <div>
              <label className="mb-1 block text-xs text-white/60">Judul</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">
                Deskripsi
              </label>
              <textarea
                className="input h-20 resize-none"
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">
                System Prompt (AI)
              </label>
              <textarea
                className="input h-36 resize-none font-mono text-xs"
                value={editing.systemPrompt}
                onChange={(e) =>
                  setEditing({ ...editing, systemPrompt: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn-secondary"
                onClick={() => setEditing(null)}
              >
                Batal
              </button>
              <button className="btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
