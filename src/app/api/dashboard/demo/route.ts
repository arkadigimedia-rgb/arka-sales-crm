import { NextResponse } from "next/server";
import { requireManager, actor } from "@/server/auth";
import { demoDashboard } from "@/server/demo-dashboard";
export async function GET(){const user=await actor();requireManager(user);return NextResponse.json(await demoDashboard());}
