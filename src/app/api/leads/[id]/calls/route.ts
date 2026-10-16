import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actor, canAccessLead } from "@/server/auth";
import { db } from "@/server/db";
import { activities, calls, followUps, leads } from "@/server/schema";
import { errorResponse } from "@/server/http";
import { broadcaster } from "@/server/events";

const outcomes = [
  "SPOKE",
  "NO_ANSWER",
  "BUSY",
  "CALL_BACK_LATER",
  "WRONG_NUMBER",
  "NOT_REACHABLE",
  "OTHER",
] as const;

const emptyToNull = (val: unknown) => (val === "" || val === null || val === undefined ? null : val);

const input = z.object({
  outcome: z.preprocess(emptyToNull, z.enum(outcomes).nullable().optional()),
  duration: z.preprocess(emptyToNull, z.coerce.number().int().min(0).nullable().optional()),
  leadResponse: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interestLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
  salespersonAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextFollowUpAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await actor();
    const { id } = await params;
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    canAccessLead(user, lead.assigneeId);

    const data = input.parse(await request.json());
    const outcome = data.outcome || "OTHER";

    // Any call attempt moves the lead out of NEW/ASSIGNED into CONTACTED (or INTERESTED if marked interested)
    const isInterested = data.interestLevel === "Interested" || data.interestLevel === "Qualified";
    const isUncontacted = ["NEW", "ASSIGNED"].includes(lead.status);
    const newStatus = isInterested
      ? "INTERESTED"
      : isUncontacted
      ? "CONTACTED"
      : lead.status;

    await db.transaction(async (tx) => {
      await tx.insert(calls).values({
        leadId: id,
        createdBy: user.id,
        duration: data.duration ?? null,
        callType: "OUTBOUND",
        outcome,
        interestLevel: data.interestLevel ?? null,
        leadResponse: data.leadResponse ?? null,
        salespersonAction: data.salespersonAction ?? null,
        nextAction: data.nextAction ?? null,
        nextFollowUpAt: data.nextFollowUpAt ?? null,
        notes: data.notes ?? null,
      });

      await tx
        .update(leads)
        .set({
          status: newStatus,
          lastContactAt: new Date(),
          leadResponse: data.leadResponse ?? lead.leadResponse,
          salespersonAction: data.salespersonAction ?? lead.salespersonAction,
          nextAction: data.nextAction ?? lead.nextAction,
          nextFollowUpAt: data.nextFollowUpAt ?? lead.nextFollowUpAt,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, id));

      if (data.nextFollowUpAt) {
        await tx.insert(followUps).values({
          leadId: id,
          assigneeId: lead.assigneeId || user.id,
          dueAt: data.nextFollowUpAt,
          reason: data.nextAction || `Call outcome: ${outcome.replaceAll("_", " ")}`,
          notes: data.notes ?? null,
        });
      }

      await tx.insert(activities).values({
        leadId: id,
        actorId: user.id,
        type: "CALL_LOGGED",
        description: `Call attempt recorded: ${outcome.replaceAll("_", " ")}`,
      });
    });

    broadcaster.broadcast("call:logged", {
      leadId: id,
      outcome,
      callerId: user.id,
      occurredAt: new Date().toISOString(),
    });
    broadcaster.broadcast("lead:updated", {
      id,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Find the next pending lead to call in the same sheet (or globally for this user)
    const scoped =
      user.role === "SALESPERSON"
        ? or(eq(leads.assigneeId, user.id), isNull(leads.assigneeId))
        : undefined;

    const [nextLead] = await db
      .select({ id: leads.id, companyName: leads.companyName })
      .from(leads)
      .where(
        and(
          scoped,
          lead.source ? eq(leads.source, lead.source) : undefined,
          ne(leads.id, id),
          inArray(leads.status, ["NEW", "ASSIGNED"])
        )
      )
      .orderBy(desc(leads.score), desc(leads.createdAt))
      .limit(1);

    return NextResponse.json({
      ok: true,
      newStatus,
      nextLeadId: nextLead?.id || null,
      nextLeadCompany: nextLead?.companyName || null,
      sheetSource: lead.source || null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
