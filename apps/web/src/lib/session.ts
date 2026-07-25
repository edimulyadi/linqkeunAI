import { db } from "@/lib/db";
import { extractToken, verifyToken } from "@/lib/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Resolves the authenticated user for the given request, or throws an
 * ApiError(401) if no valid token is present. Works for both the web app
 * (httpOnly cookie) and the Flutter mobile app (Authorization: Bearer token).
 */
export async function requireUser(req: Request) {
  const token = extractToken(req);
  if (!token) throw new ApiError(401, "Not authenticated");

  const payload = await verifyToken(token);
  if (!payload) throw new ApiError(401, "Invalid or expired session");

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new ApiError(401, "User not found");

  return user;
}

export async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Admin access required");
  }
  return user;
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
