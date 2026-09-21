import { and, asc, desc, eq, isNull, lt, ne, notInArray, sql } from "drizzle-orm";
import { db } from "./db";
import { activities, calls, followUps, leads, meetings, proposals } from "./schema";
import type { Actor } from "./auth";

const stages = ["NEW", "ASSIGNED", "CONTACTED", "CONNECTED", "INTERESTED", "QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"] as const;
export async function getDashboard(user: Actor) {
  const scoped = user.role === "SALESPERSON" ? eq(leads.assigneeId, user.id) : undefined;
  const active = notInArray(leads.status, ["WON", "LOST"]);
  const now = new Date(); const staleCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000); const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const [noNext, stale, overdue, todayCalls, upcoming, pipeline, riskRows, recent, proposalWaiting] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(leads).where(and(scoped, active, isNull(leads.nextAction))),
    db.select({ count: sql<number>`count(*)` }).from(leads).where(and(scoped, active, lt(leads.lastContactAt, staleCutoff))),
    db.select({ count: sql<number>`count(*)` }).from(followUps).innerJoin(leads, eq(followUps.leadId, leads.id)).where(and(scoped, eq(followUps.status, "UPCOMING"), lt(followUps.dueAt, now))),
    db.select({ count: sql<number>`count(*)` }).from(calls).innerJoin(leads, eq(calls.leadId, leads.id)).where(and(scoped, sql`${calls.occurredAt} >= ${startOfDay}`)),
    db.select({ id: meetings.id, startsAt: meetings.startsAt, type: meetings.type, status: meetings.status, company: leads.companyName }).from(meetings).innerJoin(leads, eq(meetings.leadId, leads.id)).where(and(scoped, ne(meetings.status, "CANCELLED"))).orderBy(asc(meetings.startsAt)).limit(6),
    db.select({ status: leads.status, count: sql<number>`count(*)` }).from(leads).where(scoped).groupBy(leads.status),
    db.select({ id: leads.id, companyName: leads.companyName, status: leads.status, priority: leads.priority, lastContactAt: leads.lastContactAt, nextAction: leads.nextAction, assigneeId: leads.assigneeId }).from(leads).where(and(scoped, active, isNull(leads.nextAction))).orderBy(desc(leads.priority), desc(leads.score)).limit(6),
    db.select({ id: activities.id, description: activities.description, createdAt: activities.createdAt, company: leads.companyName }).from(activities).innerJoin(leads, eq(activities.leadId, leads.id)).where(scoped).orderBy(desc(activities.createdAt)).limit(8),
    db.select({ count: sql<number>`count(*)` }).from(proposals).innerJoin(leads, eq(proposals.leadId, leads.id)).where(and(scoped, eq(proposals.status, "SENT"))),
  ]);
  const byStage = new Map(pipeline.map(row => [row.status, Number(row.count)]));
  return { noNext: Number(noNext[0]?.count ?? 0), stale: Number(stale[0]?.count ?? 0), overdue: Number(overdue[0]?.count ?? 0), todayCalls: Number(todayCalls[0]?.count ?? 0), proposalWaiting: Number(proposalWaiting[0]?.count ?? 0), upcoming, riskRows, recent, pipeline: stages.map(status => ({ status, count: byStage.get(status) ?? 0 })) };
}
