import { and, asc, desc, eq, isNull, lt, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { activities, calls, followUps, leads, meetings, proposals, users } from "./schema";
import type { Actor } from "./auth";

const STAGES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "CONNECTED",
  "INTERESTED",
  "QUALIFIED",
  "MEETING_SCHEDULED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export interface LiveDashboardData {
  calls: {
    today: number;
    todayDurationSeconds: number;
    todayOutcomes: Record<string, number>;
    thisWeek: number;
    thisWeekOutcomes: Record<string, number>;
    thisWeekByDay: { day: string; count: number }[];
    thisMonth: number;
    total: number;
    totalDurationSeconds: number;
    outcomesAllTime: { outcome: string; count: number }[];
  };
  leads: {
    total: number;
    bySheet: { source: string; count: number }[];
    pipeline: { status: string; count: number }[];
  };
  attention: {
    overdue: number;
    noAction: number;
    stale: number;
    proposalsWaiting: number;
  };
  recentCalls: {
    id: string;
    occurredAt: string;
    duration: number | null;
    outcome: string;
    notes: string | null;
    leadId: string;
    companyName: string;
    contactName: string;
    phone: string | null;
    callerName: string | null;
  }[];
  recentActivities: {
    id: string;
    description: string;
    createdAt: string;
    company: string;
  }[];
  upcomingMeetings: {
    id: string;
    startsAt: string;
    type: string;
    status: string;
    company: string;
  }[];
}

export async function getDashboard(user: Actor): Promise<LiveDashboardData> {
  const scoped = user.role === "SALESPERSON" ? eq(leads.assigneeId, user.id) : undefined;
  const callScoped =
    user.role === "SALESPERSON"
      ? or(eq(leads.assigneeId, user.id), eq(calls.createdBy, user.id))
      : undefined;

  const now = new Date();

  // Start of Today (00:00:00)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Start of Week (Monday 00:00:00)
  const dayOfWeek = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);

  // Start of Month (1st day 00:00:00)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const staleCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const activeLeadFilter = notInArray(leads.status, ["WON", "LOST"]);

  // Parallel database queries
  const [
    // 1. Call counts
    callsTodayRes,
    callsWeekRes,
    callsMonthRes,
    callsTotalRes,
    callsTodayOutcomesRes,
    callsWeekOutcomesRes,
    callsAllOutcomesRes,
    recentCallsRaw,

    // 2. Leads & Pipeline
    totalLeadsRes,
    leadsBySheetRes,
    pipelineRes,

    // 3. Attention items
    overdueRes,
    noActionRes,
    staleRes,
    proposalsWaitingRes,

    // 4. Upcoming & activities
    upcomingMeetingsRaw,
    recentActivitiesRaw,
  ] = await Promise.all([
    // Today's calls
    db
      .select({
        count: sql<number>`count(*)`,
        duration: sql<number>`coalesce(sum(${calls.duration}), 0)`,
      })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(and(callScoped, sql`${calls.occurredAt} >= ${startOfDay}`)),

    // Week's calls
    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(and(callScoped, sql`${calls.occurredAt} >= ${startOfWeek}`)),

    // Month's calls
    db
      .select({ count: sql<number>`count(*)` })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(and(callScoped, sql`${calls.occurredAt} >= ${startOfMonth}`)),

    // Total lifetime calls
    db
      .select({
        count: sql<number>`count(*)`,
        duration: sql<number>`coalesce(sum(${calls.duration}), 0)`,
      })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(callScoped),

    // Today's outcomes
    db
      .select({ outcome: calls.outcome, count: sql<number>`count(*)` })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(and(callScoped, sql`${calls.occurredAt} >= ${startOfDay}`))
      .groupBy(calls.outcome),

    // Week's outcomes
    db
      .select({ outcome: calls.outcome, count: sql<number>`count(*)` })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(and(callScoped, sql`${calls.occurredAt} >= ${startOfWeek}`))
      .groupBy(calls.outcome),

    // All-time outcomes
    db
      .select({ outcome: calls.outcome, count: sql<number>`count(*)` })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(callScoped)
      .groupBy(calls.outcome)
      .orderBy(desc(sql<number>`count(*)`)),

    // Recent 12 calls
    db
      .select({
        id: calls.id,
        occurredAt: calls.occurredAt,
        duration: calls.duration,
        outcome: calls.outcome,
        notes: calls.notes,
        leadId: calls.leadId,
        companyName: leads.companyName,
        contactName: leads.contactName,
        phone: leads.phone,
        callerName: users.name,
      })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .leftJoin(users, eq(calls.createdBy, users.id))
      .where(callScoped)
      .orderBy(desc(calls.occurredAt))
      .limit(12),

    // Total leads
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(scoped),

    // Leads by Sheet / Source
    db
      .select({
        source: sql<string>`coalesce(${leads.source}, 'Unassigned Sheet')`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(scoped)
      .groupBy(leads.source)
      .orderBy(desc(sql<number>`count(*)`)),

    // Pipeline by status
    db
      .select({ status: leads.status, count: sql<number>`count(*)` })
      .from(leads)
      .where(scoped)
      .groupBy(leads.status),

    // Overdue followups
    db
      .select({ count: sql<number>`count(*)` })
      .from(followUps)
      .innerJoin(leads, eq(followUps.leadId, leads.id))
      .where(and(scoped, eq(followUps.status, "UPCOMING"), lt(followUps.dueAt, now))),

    // Leads without next action
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(scoped, activeLeadFilter, isNull(leads.nextAction))),

    // Stale leads (>72h no contact)
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(scoped, activeLeadFilter, lt(leads.lastContactAt, staleCutoff))),

    // Proposals awaiting response
    db
      .select({ count: sql<number>`count(*)` })
      .from(proposals)
      .innerJoin(leads, eq(proposals.leadId, leads.id))
      .where(and(scoped, eq(proposals.status, "SENT"))),

    // Upcoming meetings
    db
      .select({
        id: meetings.id,
        startsAt: meetings.startsAt,
        type: meetings.type,
        status: meetings.status,
        company: leads.companyName,
      })
      .from(meetings)
      .innerJoin(leads, eq(meetings.leadId, leads.id))
      .where(and(scoped, ne(meetings.status, "CANCELLED")))
      .orderBy(asc(meetings.startsAt))
      .limit(6),

    // Recent activities
    db
      .select({
        id: activities.id,
        description: activities.description,
        createdAt: activities.createdAt,
        company: leads.companyName,
      })
      .from(activities)
      .innerJoin(leads, eq(activities.leadId, leads.id))
      .where(scoped)
      .orderBy(desc(activities.createdAt))
      .limit(8),
  ]);

  // Outcomes maps
  const todayOutcomes: Record<string, number> = {};
  for (const r of callsTodayOutcomesRes) {
    todayOutcomes[r.outcome] = Number(r.count);
  }

  const thisWeekOutcomes: Record<string, number> = {};
  for (const r of callsWeekOutcomesRes) {
    thisWeekOutcomes[r.outcome] = Number(r.count);
  }

  // Pipeline map
  const pipelineMap = new Map(pipelineRes.map((r) => [r.status, Number(r.count)]));

  // Build weekday distribution for the current week
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const thisWeekByDay = days.map((day) => ({ day, count: 0 }));

  // Query calls in this week grouped by day
  try {
    const dailyCallsRes = await db
      .select({
        dayIdx: sql<number>`extract(isodow from ${calls.occurredAt})::int`,
        count: sql<number>`count(*)`,
      })
      .from(calls)
      .innerJoin(leads, eq(calls.leadId, leads.id))
      .where(and(callScoped, sql`${calls.occurredAt} >= ${startOfWeek}`))
      .groupBy(sql`extract(isodow from ${calls.occurredAt})`);

    for (const r of dailyCallsRes) {
      const idx = Number(r.dayIdx) - 1; // 1=Mon -> 0
      if (idx >= 0 && idx < 7) {
        thisWeekByDay[idx].count = Number(r.count);
      }
    }
  } catch {
    // Fallback if isodow extraction is not available
  }

  return {
    calls: {
      today: Number(callsTodayRes[0]?.count ?? 0),
      todayDurationSeconds: Number(callsTodayRes[0]?.duration ?? 0),
      todayOutcomes,
      thisWeek: Number(callsWeekRes[0]?.count ?? 0),
      thisWeekOutcomes,
      thisWeekByDay,
      thisMonth: Number(callsMonthRes[0]?.count ?? 0),
      total: Number(callsTotalRes[0]?.count ?? 0),
      totalDurationSeconds: Number(callsTotalRes[0]?.duration ?? 0),
      outcomesAllTime: callsAllOutcomesRes.map((r) => ({
        outcome: r.outcome,
        count: Number(r.count),
      })),
    },
    leads: {
      total: Number(totalLeadsRes[0]?.count ?? 0),
      bySheet: leadsBySheetRes.map((r) => ({
        source: r.source,
        count: Number(r.count),
      })),
      pipeline: STAGES.map((status) => ({
        status,
        count: pipelineMap.get(status) ?? 0,
      })),
    },
    attention: {
      overdue: Number(overdueRes[0]?.count ?? 0),
      noAction: Number(noActionRes[0]?.count ?? 0),
      stale: Number(staleRes[0]?.count ?? 0),
      proposalsWaiting: Number(proposalsWaitingRes[0]?.count ?? 0),
    },
    recentCalls: recentCallsRaw.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt.toISOString(),
      duration: r.duration,
      outcome: r.outcome,
      notes: r.notes,
      leadId: r.leadId,
      companyName: r.companyName,
      contactName: r.contactName,
      phone: r.phone,
      callerName: r.callerName,
    })),
    recentActivities: recentActivitiesRaw.map((r) => ({
      id: r.id,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      company: r.company,
    })),
    upcomingMeetings: upcomingMeetingsRaw.map((r) => ({
      id: r.id,
      startsAt: r.startsAt.toISOString(),
      type: r.type,
      status: r.status,
      company: r.company,
    })),
  };
}
