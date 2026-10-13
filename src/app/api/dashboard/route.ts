import { NextResponse } from "next/server";
import { actor } from "@/server/auth";
import { getDashboard } from "@/server/dashboard";
import { errorResponse } from "@/server/http";

export async function GET() {
  try {
    const user = await actor();
    const data = await getDashboard(user);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
