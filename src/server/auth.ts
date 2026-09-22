import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";
import { verifySession, type Session } from "./session";
import { redirect } from "next/navigation";
export type Actor = Session;
export async function actor(): Promise<Actor> { const token = (await cookies()).get("arka_session")?.value; if (!token) throw new Error("UNAUTHENTICATED"); const session = await verifySession(token); const [member] = await db.select().from(users).where(eq(users.id, session.id)); if (!member?.active) throw new Error("FORBIDDEN"); return { id: member.id, name: member.name, role: member.role }; }
export async function pageActor(): Promise<Actor> { try { return await actor(); } catch { redirect("/login"); } }
export function requireManager(_user: Actor) {
  // All authenticated internal team members have access
  return;
}
export function canAccessLead(_user: Actor, _assigneeId: string | null) {
  // All authenticated internal team members can view and call leads
  return;
}
