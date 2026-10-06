import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actor } from "@/server/auth";
import { db } from "@/server/db";
import { activities, followUps, leads } from "@/server/schema";
import { errorResponse } from "@/server/http";
import { broadcaster } from "@/server/events";

const emptyToNull = (val: unknown) => {
  if (val === "" || val === undefined || val === null) return null;
  if (typeof val === "string" && !val.trim()) return null;
  return val;
};

const input = z.object({
  companyName: z.string().min(1, "Company or school name is required"),
  contactName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().email("Invalid email address").nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  whatsapp: z.preprocess(emptyToNull, z.string().nullable().optional()),
  website: z.preprocess(emptyToNull, z.string().nullable().optional()),
  location: z.preprocess(emptyToNull, z.string().nullable().optional()),
  source: z.preprocess(emptyToNull, z.string().default("MANUAL_ENTRY").optional()),
  industry: z.preprocess(emptyToNull, z.string().nullable().optional()),
  serviceInterest: z.preprocess(emptyToNull, z.string().nullable().optional()),
  companySize: z.preprocess(emptyToNull, z.string().nullable().optional()),
  score: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(100).default(50).optional()),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextFollowUpAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function GET(request: NextRequest) {
  try {
    const user = await actor(),
      p = request.nextUrl.searchParams,
      page = Math.max(1, Number(p.get("page") || 1)),
      size = Math.min(100, Number(p.get("size") || 25)),
      search = p.get("search"),
      where = and(
        user.role === "SALESPERSON" ? eq(leads.assigneeId, user.id) : undefined,
        p.get("status") ? eq(leads.status, p.get("status") as typeof leads.status.enumValues[number]) : undefined,
        p.get("priority") ? eq(leads.priority, p.get("priority") as typeof leads.priority.enumValues[number]) : undefined,
        search
          ? or(
              ilike(leads.companyName, `%${search}%`),
              ilike(leads.contactName, `%${search}%`),
              ilike(leads.email, `%${search}%`),
              ilike(leads.phone, `%${search}%`),
              ilike(leads.location, `%${search}%`)
            )
          : undefined
      );
    const [items, total] = await Promise.all([
      db.select().from(leads).where(where).orderBy(desc(leads.updatedAt)).limit(size).offset((page - 1) * size),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
    ]);
    return NextResponse.json({ items, page, size, total: Number(total[0].count) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await actor();
    const data = input.parse(await request.json());

    if (user.role === "SALESPERSON" && data.assigneeId && data.assigneeId !== user.id) {
      throw new Error("FORBIDDEN");
    }

    const assigneeId = data.assigneeId || user.id;
    const contactName = data.contactName || data.companyName;

    const [lead] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(leads)
        .values({
          companyName: data.companyName,
          contactName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          whatsapp: data.whatsapp ?? null,
          website: data.website ?? null,
          location: data.location ?? null,
          source: data.source || "MANUAL_ENTRY",
          industry: data.industry || "School / Education",
          serviceInterest: data.serviceInterest ?? null,
          companySize: data.companySize ?? null,
          score: data.score ?? 50,
          priority: data.priority,
          status: assigneeId ? "ASSIGNED" : "NEW",
          assigneeId,
          createdBy: user.id,
          nextAction: data.nextAction ?? null,
          nextFollowUpAt: data.nextFollowUpAt ?? null,
          notes: data.notes ?? null,
        })
        .returning();

      if (data.nextFollowUpAt) {
        await tx.insert(followUps).values({
          leadId: created.id,
          assigneeId,
          dueAt: data.nextFollowUpAt,
          reason: data.nextAction || "Initial follow-up",
          notes: data.notes ?? null,
        });
      }

      await tx.insert(activities).values({
        leadId: created.id,
        actorId: user.id,
        type: "LEAD_CREATED",
        description: `Created lead ${created.companyName}`,
      });

      return [created];
    });

    broadcaster.broadcast("lead:created", {
      id: lead.id,
      companyName: lead.companyName,
      assigneeId: lead.assigneeId,
      createdAt: lead.createdAt.toISOString(),
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
