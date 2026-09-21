import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, type Session } from "./session";

describe("session", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "super-secret-key-that-is-at-least-32-chars-long";
  });

  it("signs and verifies a session token", async () => {
    const user: Session = {
      id: "usr_123",
      name: "Test User",
      role: "SALESPERSON",
    };

    const token = await signSession(user);
    expect(typeof token).toBe("string");

    const decoded = await verifySession(token);
    expect(decoded.id).toBe(user.id);
    expect(decoded.name).toBe(user.name);
    expect(decoded.role).toBe(user.role);
  });
});
