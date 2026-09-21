import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { signSession } from "@/server/session";
import { DEFAULT_USERS, seedDefaultUsers } from "@/server/seed-users";

const input = z.object({ email: z.string().email(), password: z.string().min(1).max(256) });

export async function POST(request: Request) {
  try {
    const { email, password } = input.parse(await request.json());
    const cleanEmail = email.trim().toLowerCase();

    let [user] = await db.select().from(users).where(eq(users.email, cleanEmail));

    // Auto-seed default accounts on demand if not present in database
    if (!user) {
      const isKnownDefault = DEFAULT_USERS.some((u) => u.email.toLowerCase() === cleanEmail);
      if (isKnownDefault) {
        try {
          await seedDefaultUsers();
          [user] = await db.select().from(users).where(eq(users.email, cleanEmail));
        } catch {
          // Ignore error if DB is unreachable
        }
      }
    }

    if (!user?.active || !user.passwordHash || !(await compare(password, user.passwordHash))) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const token = await signSession({ id: user.id, name: user.name, role: user.role });
    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
    });

    response.cookies.set("arka_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "INVALID_REQUEST", message: "Enter a valid email and password." } },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Authentication error.";
    console.error("[login] Error during authentication:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

