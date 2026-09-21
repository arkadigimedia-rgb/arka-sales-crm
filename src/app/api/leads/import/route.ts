import * as XLSX from "xlsx";
import { and, eq, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { actor, requireManager } from "@/server/auth";
import { db } from "@/server/db";
import { activities, leads } from "@/server/schema";
import { errorResponse } from "@/server/http";
import { broadcaster } from "@/server/events";

type Row = Record<string, unknown>;
const clean = (value: unknown) => String(value ?? "").trim();
const absent = (value: unknown) => !clean(value) || clean(value).toLowerCase() === "not found";
const priority = (value: unknown): "LOW" | "MEDIUM" | "HIGH" | "URGENT" => { const tiers: Record<string, "LOW" | "MEDIUM" | "HIGH" | "URGENT"> = { A: "URGENT", B: "HIGH", C: "MEDIUM" }; return tiers[clean(value).toUpperCase()] ?? "MEDIUM"; };

export async function POST(request: NextRequest) {
  try {
    const user = await actor(); requireManager(user);
    const data = await request.formData(); const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an .xlsx or .xls file first." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "The file must be 10 MB or smaller." }, { status: 400 });
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const sheet = workbook.Sheets["School Leads"] || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return NextResponse.json({ error: "No worksheet was found in this file." }, { status: 400 });
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null });
    let imported = 0, duplicates = 0, invalid = 0;
    for (const row of rows) {
      const companyName = clean(row["Business Name"] ?? row["Company Name"] ?? row.Company);
      const contactName = clean(row["Contact Name"] ?? row.Contact ?? companyName);
      const phone = absent(row.Phone) ? null : clean(row.Phone).replace(/\s+/g, " ");
      const email = absent(row.Email) ? null : clean(row.Email).toLowerCase();
      const location = clean(row.City ?? row.Location) || null;
      if (!companyName) { invalid++; continue; }
      const duplicate = await db.select({ id: leads.id }).from(leads).where(or(phone ? eq(leads.phone, phone) : undefined, email ? eq(leads.email, email) : undefined, and(eq(leads.companyName, companyName), location ? eq(leads.location, location) : isNull(leads.location)))).limit(1);
      if (duplicate.length) { duplicates++; continue; }
      await db.transaction(async tx => {
        const [lead] = await tx.insert(leads).values({ companyName, contactName, phone, email, website: absent(row.Website) ? null : clean(row.Website), location, industry: clean(row.Category ?? row.Industry) || null, source: "EXCEL_UPLOAD", serviceInterest: clean(row["Recommended Arka Service"] ?? row["Service Interest"]) || null, score: Number(row["Lead Score"] ?? row.Score) || 0, priority: priority(row["Priority Tier"] ?? row.Priority), status: "NEW", assigneeId: user.id, createdBy: user.id, notes: [clean(row["Full Address"]), clean(row["Digital Problem Identified"]), clean(row["Why Arka?"])].filter(Boolean).join("\n\n") || null }).returning();
        await tx.insert(activities).values({ leadId: lead.id, actorId: user.id, type: "LEAD_IMPORTED", description: `Lead imported from ${file.name}`, metadata: { sourceFile: file.name } });
      });
      imported++;
    }
    broadcaster.broadcast("leads:imported", { imported, duplicates, invalid, totalRows: rows.length });
    return NextResponse.json({ imported, duplicates, invalid, totalRows: rows.length });
  } catch (error) { return errorResponse(error); }
}
