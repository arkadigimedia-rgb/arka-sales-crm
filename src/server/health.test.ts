import { describe, it, expect, vi } from "vitest";
import { GET } from "../app/api/health/route";

describe("GET /api/health", () => {
  it("returns 503 when DATABASE_URL is missing", async () => {
    const origUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.database.connected).toBe(false);

    if (origUrl) process.env.DATABASE_URL = origUrl;
  });
});
