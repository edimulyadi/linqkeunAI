"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tool {
  id: string;
  code: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
  kind: string;
}
interface Category {
  id: string;
  title: string;
  subtitle: string | null;
  tools: Tool[];
}

export default function DashboardPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/tools")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []));
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold">Karyawan AI Anda</h1>
        <p className="mt-1 text-white/60">
          Pilih karyawan AI di bawah untuk mulai bekerja.
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="mb-1 text-lg font-semibold text-brand-300">
            {cat.title}
          </h2>
          {cat.subtitle && (
            <p className="mb-4 text-sm text-white/50">{cat.subtitle}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.tools.map((tool) => (
              <Link
                key={tool.id}
                href={`/dashboard/tools/${tool.slug}`}
                className="card block transition hover:border-brand-400/40"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-brand-400/10 px-2 py-0.5 text-xs font-medium text-brand-300">
                    {tool.code}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/40">
                    {tool.kind === "CHAT_ASSISTANT" ? "Chat" : "Generator"}
                  </span>
                </div>
                <h3 className="font-semibold">{tool.title}</h3>
                <p className="mt-1 text-sm text-white/60">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
