import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { hash } from "bcryptjs";

// Load local env files if running outside container
if (fs.existsSync(".env.local")) {
  const { loadEnvFile } = await import("node:process");
  loadEnvFile(".env.local");
} else if (fs.existsSync(".env")) {
  const { loadEnvFile } = await import("node:process");
  loadEnvFile(".env");
}

const DEFAULT_USERS = [
  {
    id: "user-admin-founder",
    name: "System Admin",
    email: "admin@arkasales.com",
    role: "FOUNDER",
    plainPassword: "admin123",
  },
  {
    id: "sales-head-nilesh-rawat",
    name: "Nilesh Rawat",
    email: "nileshrawat1325@gmail.com",
    role: "SALES_HEAD",
    plainPassword: "123456",
  },
  {
    id: "salesperson-gayithri-v",
    name: "Gayithri V",
    email: "gayathrivhere@gmail.com",
    role: "SALESPERSON",
    plainPassword: "123456",
  },
];

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log("[start] DATABASE_URL not set, skipping database initialization.");
    return;
  }

  const isLocal =
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  // 1. Retry loop: wait for Postgres to become ready
  const maxRetries = 12;
  const delayMs = 3000;
  let connected = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[start] Connecting to database (attempt ${attempt}/${maxRetries})...`);
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      connected = true;
      console.log("[start] Database connected successfully!");
      break;
    } catch (err) {
      console.warn(`[start] Database not ready yet (${err.message}). Retrying in ${delayMs / 1000}s...`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  if (!connected) {
    console.error("[start] Warning: Could not establish initial DB connection after retries. Starting server anyway...");
    await pool.end().catch(() => {});
    return;
  }

  // 2. Run migrations
  try {
    console.log("[start] Applying database schema migrations...");
    const db = drizzle(pool);
    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("[start] Database schema migrations applied successfully.");
  } catch (err) {
    console.error("[start] Migration note:", err.message);
  }

  // 3. Seed default users
  try {
    console.log("[start] Seeding default authentication accounts...");
    await pool.query(`DELETE FROM users WHERE email = 'sales@arkasales.com'`).catch(() => {});
    for (const u of DEFAULT_USERS) {
      const passwordHash = await hash(u.plainPassword, 10);
      await pool.query(
        `INSERT INTO users (id, name, email, role, active, password_hash, must_change_password, updated_at)
         VALUES ($1, $2, $3, $4, true, $5, false, NOW())
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             role = EXCLUDED.role,
             password_hash = EXCLUDED.password_hash,
             updated_at = NOW()`,
        [u.id, u.name, u.email.toLowerCase(), u.role, passwordHash]
      );
    }
    console.log("[start] Default accounts ready: admin@arkasales.com (FOUNDER), nileshrawat1325@gmail.com (SALES_HEAD), gayathrivhere@gmail.com (SALESPERSON)");
  } catch (err) {
    console.error("[start] User seed note:", err.message);
  }

  await pool.end().catch(() => {});
}

async function startServer() {
  await setupDatabase().catch((err) => {
    console.error("[start] Setup encountered an issue:", err);
  });

  const port = process.env.PORT || "3000";
  console.log(`[start] Launching Next.js production server on port ${port}...`);

  // Locate next binary
  let nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");
  if (!fs.existsSync(nextBin)) {
    const fallbackBin = path.resolve(process.cwd(), "node_modules/.bin/next");
    if (fs.existsSync(fallbackBin)) {
      nextBin = fallbackBin;
    }
  }

  let child;
  if (fs.existsSync(nextBin)) {
    child = spawn(process.execPath, [nextBin, "start", "-p", port], {
      stdio: "inherit",
      env: process.env,
    });
  } else {
    // Fallback using npx
    child = spawn("npx", ["next", "start", "-p", port], {
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
  }

  child.on("error", (err) => {
    console.error("[start] Failed to start Next.js process:", err);
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

startServer();
