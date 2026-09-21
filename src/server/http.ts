import { NextResponse } from "next/server";
export function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : "Internal error"; const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500; return NextResponse.json({ error: status === 500 ? "Internal error" : message }, { status }); }
