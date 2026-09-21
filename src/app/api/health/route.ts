import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          status: "degraded",
          service: "arka-internal-sales-crm",
          database: {
            connected: false,
            error: "DATABASE_URL environment variable is not configured",
            latencyMs: null,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    await db.execute(sql`SELECT 1 as ping`);
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      service: "arka-internal-sales-crm",
      database: {
        connected: true,
        latencyMs,
      },
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        status: "degraded",
        service: "arka-internal-sales-crm",
        database: {
          connected: false,
          error: error instanceof Error ? error.message : "Database connection failed",
          latencyMs,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

