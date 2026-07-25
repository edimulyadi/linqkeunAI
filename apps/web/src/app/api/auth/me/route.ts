export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/session";
import { errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
