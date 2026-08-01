export const dynamic = "force-dynamic";

import { requireUser, errorResponse } from "@/lib/session";
import { runWithTools } from "@/lib/anthropic";
import { STATIC_TOOLS, type ToolContext } from "@/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANALYST_SYSTEM_PROMPT = `Anda adalah mesin analisis bisnis internal Linqkeun AI. Tugas Anda: memeriksa data BusinessMetric dan daftar tugas terbaru, lalu menghasilkan ringkasan singkat untuk dashboard eksekutif.

Langkah wajib:
1. Panggil tool "get_business_metrics" untuk melihat tren pendapatan, pengeluaran, dan pelanggan 6 bulan terakhir.
2. Panggil tool "list_tasks" dengan status "TODO" atau "IN_PROGRESS" untuk melihat beban kerja saat ini.
3. Setelah itu, balas HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan tambahan) dengan bentuk persis:
{"headline": "satu kalimat ringkasan situasi", "insights": ["poin 1", "poin 2", "poin 3"], "recommendedAction": "satu rekomendasi tindakan konkret", "watchAgentSlug": "slug agent paling relevan untuk menindaklanjuti, salah satu dari: finance-ai, marketing-ai, hr-ai, operations-ai, ceo-ai"}`;

interface AnalysisResult {
  headline: string;
  insights: string[];
  recommendedAction: string;
  watchAgentSlug: string;
}

function parseAnalysis(text: string): AnalysisResult | null {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.headline === "string" && Array.isArray(parsed.insights)) {
      return parsed as AnalysisResult;
    }
  } catch {
    // fall through
  }
  return null;
}

// Powers the Dashboard "AI Insights" panel: a structured, tool-grounded
// summary of business health (not a persona chat — see runAgentTurn for
// that flow).
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);

    const result = await runWithTools<ToolContext>({
      system: ANALYST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Analisis performa bisnis saat ini." }],
      tools: [STATIC_TOOLS.get_business_metrics.definition, STATIC_TOOLS.list_tasks.definition],
      executors: {
        get_business_metrics: STATIC_TOOLS.get_business_metrics.execute,
        list_tasks: STATIC_TOOLS.list_tasks.execute,
      },
      ctx: { userId: user.id },
      effort: "medium",
      maxTokens: 1024,
    });

    const analysis = parseAnalysis(result.text);
    if (!analysis) {
      return Response.json({
        analysis: {
          headline: "Analisis tersedia, tapi formatnya tidak sesuai ekspektasi.",
          insights: [result.text.slice(0, 300)],
          recommendedAction: "Coba muat ulang panel ini.",
          watchAgentSlug: "ceo-ai",
        },
      });
    }
    return Response.json({ analysis });
  } catch (error) {
    return errorResponse(error);
  }
}
