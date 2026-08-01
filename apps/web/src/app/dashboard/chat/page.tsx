"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The AI Chat index has no agent of its own — redirect to the first active
// agent (CEO AI, by seeded order).
export default function ChatIndexPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        const first = data.agents?.[0];
        if (first) router.replace(`/dashboard/chat/${first.slug}`);
      });
  }, [router]);

  return <p className="text-white/60">Memuat AI Chat...</p>;
}
