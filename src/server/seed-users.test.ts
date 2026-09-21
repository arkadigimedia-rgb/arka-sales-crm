import { describe, it, expect } from "vitest";
import { DEFAULT_USERS } from "./seed-users";

describe("DEFAULT_USERS", () => {
  it("contains both Admin and Sales Head logins", () => {
    const admin = DEFAULT_USERS.find((u) => u.role === "FOUNDER");
    expect(admin).toBeDefined();
    expect(admin?.email).toBe("admin@arkasales.com");
    expect(admin?.plainPassword).toBe("admin123");

    const salesHead = DEFAULT_USERS.find((u) => u.role === "SALES_HEAD");
    expect(salesHead).toBeDefined();
    expect(salesHead?.email).toBe("nileshrawat1325@gmail.com");
    expect(salesHead?.plainPassword).toBe("123456");
  });
});
