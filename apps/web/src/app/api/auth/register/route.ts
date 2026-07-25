export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { errorResponse, ApiError } from "@/lib/session";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { name, email, password } = bodySchema.parse(json);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "Email sudah terdaftar");
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
      },
    });

    await db.subscription.create({
      data: { userId: user.id, planCode: "free" },
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const res = Response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
    res.headers.append(
      "Set-Cookie",
      `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
