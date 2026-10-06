import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { pageActor } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/schema";
import { ConnectionStatus } from "@/components/connection-status";
import { LogoutButton } from "@/components/logout-button";
import { NewLeadForm } from "@/components/new-lead-form";

export default async function NewLeadPage() {
  const user = await pageActor();

  const activeUsers = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));

  return (
    <main className="new-lead-page">
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <Link className="link" href="/leads">
          ← Back to leads
        </Link>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ConnectionStatus />
          <LogoutButton variant="header" />
        </div>
      </div>

      <NewLeadForm users={activeUsers} currentUserId={user.id} />
    </main>
  );
}
