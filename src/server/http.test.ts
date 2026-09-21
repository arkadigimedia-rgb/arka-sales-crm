import { describe, it, expect } from "vitest";
import { errorResponse } from "./http";

describe("errorResponse", () => {
  it("returns 401 for UNAUTHENTICATED error", async () => {
    const res = errorResponse(new Error("UNAUTHENTICATED"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "UNAUTHENTICATED" });
  });

  it("returns 403 for FORBIDDEN error", async () => {
    const res = errorResponse(new Error("FORBIDDEN"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "FORBIDDEN" });
  });

  it("returns 500 for generic error", async () => {
    const res = errorResponse(new Error("Database connection lost"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal error" });
  });
});
