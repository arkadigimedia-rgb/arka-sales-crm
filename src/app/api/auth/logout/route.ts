import { NextResponse } from "next/server";
export async function POST() { const response = NextResponse.json({ data: { success: true } }); response.cookies.set("arka_session", "", { httpOnly: true, path: "/", maxAge: 0 }); return response; }
