export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const tool = await db.aiTool.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      code: true,
      slug: true,
      title: true,
      icon: true,
      description: true,
      kind: true,
      priceRupiah: true,
      isActive: true,
      category: { select: { title: true, slug: true } },
    },
  });

  if (!tool || !tool.isActive) {
    return Response.json({ error: "Tool not found" }, { status: 404 });
  }

  return Response.json({ tool });
}
