import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";
import { verifySession, type Session } from "./session";
import { redirect } from "next/navigation";
export type Actor = Session;
export async function actor(): Promise<Actor> { const token = (await cookies()).get("arka_session")?.value; if (!token) throw new Error("UNAUTHENTICATED"); const session = await verifySession(token); const [member] = await db.select().from(users).where(eq(users.id, session.id)); if (!member?.active) throw new Error("FORBIDDEN"); return { id: member.id, name: member.name, role: member.role }; }
export async function pageActor(): Promise<Actor> { try { return await actor(); } catch { redirect("/login"); } }
export function requireManager(user: Actor) { if (user.role === "SALESPERSON") throw new Error("FORBIDDEN"); }
export function canAccessLead(user: Actor, assigneeId: string | null) { if (user.role === "SALESPERSON" && assigneeId !== user.id) throw new Error("FORBIDDEN"); }
