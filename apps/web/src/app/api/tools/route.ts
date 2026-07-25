export const dynamic = "force-dynamic";

import { db } from "@/lib/db";

// Returns the full catalog grouped by category — used by the web dashboard
// and the Flutter app's home screen.
export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { order: "asc" },
    include: {
      tools: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          code: true,
          slug: true,
          title: true,
          icon: true,
          description: true,
          kind: true,
          priceRupiah: true,
        },
      },
    },
  });

  return Response.json({ categories });
}
