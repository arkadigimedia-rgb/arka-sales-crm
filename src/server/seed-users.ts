import fs from "node:fs";
import { loadEnvFile } from "node:process";
import { hash } from "bcryptjs";
import { db } from "./db";
import { users } from "./schema";

if (fs.existsSync(".env.local")) loadEnvFile(".env.local");
else if (fs.existsSync(".env")) loadEnvFile(".env");

export const DEFAULT_USERS = [
  {
    id: "user-admin-founder",
    name: "System Admin",
    email: "admin@arkasales.com",
    role: "FOUNDER" as const,
    active: true,
    plainPassword: "admin123",
  },
  {
    id: "sales-head-nilesh-rawat",
    name: "Nilesh Rawat",
    email: "nileshrawat1325@gmail.com",
    role: "SALES_HEAD" as const,
    active: true,
    plainPassword: "123456",
  },
  {
    id: "salesperson-aakash-sharma",
    name: "Aakash Sharma",
    email: "sales@arkasales.com",
    role: "SALESPERSON" as const,
    active: true,
    plainPassword: "123456",
  },
];

export async function seedDefaultUsers() {
  const results = [];
  for (const u of DEFAULT_USERS) {
    const passwordHash = await hash(u.plainPassword, 10);
    const [user] = await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        role: u.role,
        active: u.active,
        passwordHash,
        mustChangePassword: false,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: u.name,
          role: u.role,
          active: u.active,
          passwordHash,
          updatedAt: new Date(),
        },
      })
      .returning();
    results.push(user);
  }
  return results;
}

if (process.argv[1]?.includes("seed-users")) {
  seedDefaultUsers()
    .then((seeded) => {
      console.log("Successfully seeded users:", seeded.map((u) => ({ email: u.email, role: u.role })));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
