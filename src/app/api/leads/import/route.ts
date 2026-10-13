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
const priority = (value: unknown): "LOW" | "MEDIUM" | "HIGH" | "URGENT" => {
  const tiers: Record<string, "LOW" | "MEDIUM" | "HIGH" | "URGENT"> = {
    A: "URGENT",
    B: "HIGH",
    C: "MEDIUM",
    URGENT: "URGENT",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
  };
  return tiers[clean(value).toUpperCase()] ?? "MEDIUM";
};

export async function POST(request: NextRequest) {
  try {
    const user = await actor();
    requireManager(user);

    const data = await request.formData();
    const file = data.get("file");
    const customSheetLabel = clean(data.get("sheetLabel"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an .xlsx or .xls file first." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "The file must be 15 MB or smaller." }, { status: 400 });
    }

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: "No worksheets found in this Excel file." }, { status: 400 });
    }

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalInvalid = 0;
    let totalRows = 0;
    const sheetResults: { sheetName: string; imported: number; duplicates: number; rows: number }[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rows = XLSX.utils.sheet_to_json<Row>(worksheet, { defval: null });
      if (!rows || rows.length === 0) continue;

      totalRows += rows.length;
      let sheetImported = 0;
      let sheetDuplicates = 0;

      // Tag the source specifically as "Sheet: <Name>" or the user's custom label
      const leadSource = customSheetLabel
        ? (workbook.SheetNames.length > 1 ? `Sheet: ${customSheetLabel} (${sheetName})` : `Sheet: ${customSheetLabel}`)
        : `Sheet: ${sheetName}`;

      for (const row of rows) {
        const companyName = clean(
          row["Business Name"] ??
          row["Company Name"] ??
          row["Company"] ??
          row["School Name"] ??
          row["Name"]
        );
        const contactName = clean(
          row["Contact Name"] ??
          row["Contact Person"] ??
          row["Contact"] ??
          row["Principal Name"] ??
          row["Owner"] ??
          companyName
        );
        const phone = absent(row.Phone ?? row["Phone Number"] ?? row["Mobile"] ?? row["Contact Number"])
          ? null
          : clean(row.Phone ?? row["Phone Number"] ?? row["Mobile"] ?? row["Contact Number"]).replace(/\s+/g, " ");
        const email = absent(row.Email ?? row["Email Address"])
          ? null
          : clean(row.Email ?? row["Email Address"]).toLowerCase();
        const location = clean(row.City ?? row.Location ?? row.District ?? row.Town) || null;

        if (!companyName) {
          totalInvalid++;
          continue;
        }

        // Duplicate check by phone, email, or company + location
        const duplicate = await db
          .select({ id: leads.id })
          .from(leads)
          .where(
            or(
              phone ? eq(leads.phone, phone) : undefined,
              email ? eq(leads.email, email) : undefined,
              and(
                eq(leads.companyName, companyName),
                location ? eq(leads.location, location) : isNull(leads.location)
              )
            )
          )
          .limit(1);

        if (duplicate.length > 0) {
          totalDuplicates++;
          sheetDuplicates++;
          continue;
        }

        const rawNotes = [
          clean(row["Full Address"] ?? row["Address"]),
          clean(row["Digital Problem Identified"] ?? row["Problem"]),
          clean(row["Why Arka?"] ?? row["Remarks"] ?? row["Notes"]),
          `Source file: ${file.name} | Sheet: ${sheetName}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        await db.transaction(async (tx) => {
          const [lead] = await tx
            .insert(leads)
            .values({
              companyName,
              contactName,
              phone,
              email,
              website: absent(row.Website ?? row["Web Address"]) ? null : clean(row.Website ?? row["Web Address"]),
              location,
              industry: clean(row.Category ?? row.Industry ?? row.Type) || "Education / School",
              source: leadSource,
              serviceInterest: clean(row["Recommended Arka Service"] ?? row["Service Interest"] ?? row["Service Required"]) || null,
              score: Number(row["Lead Score"] ?? row.Score) || 50,
              priority: priority(row["Priority Tier"] ?? row.Priority),
              status: "NEW",
              assigneeId: user.id,
              createdBy: user.id,
              notes: rawNotes || null,
            })
            .returning();

          await tx.insert(activities).values({
            leadId: lead.id,
            actorId: user.id,
            type: "LEAD_IMPORTED",
            description: `Lead imported from ${file.name} (${leadSource})`,
            metadata: { sourceFile: file.name, sheetName, source: leadSource },
          });
        });

        totalImported++;
        sheetImported++;
      }

      sheetResults.push({
        sheetName,
        imported: sheetImported,
        duplicates: sheetDuplicates,
        rows: rows.length,
      });
    }

    broadcaster.broadcast("leads:imported", {
      imported: totalImported,
      duplicates: totalDuplicates,
      invalid: totalInvalid,
      totalRows,
      sheets: sheetResults,
    });

    return NextResponse.json({
      imported: totalImported,
      duplicates: totalDuplicates,
      invalid: totalInvalid,
      totalRows,
      sheets: sheetResults,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
