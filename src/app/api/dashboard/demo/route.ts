import { NextResponse } from "next/server";
import { requireManager, actor } from "@/server/auth";
import { demoDashboard } from "@/server/demo-dashboard";
export async function GET() {
  await actor();
  return NextResponse.json(await demoDashboard());
}
