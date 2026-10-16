import Link from "next/link";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { pageActor, canAccessLead } from "@/server/auth";
import { db } from "@/server/db";
import { activities, calls, comments, followUps, leads, meetings, proposals } from "@/server/schema";
import { CallOutcomeForm } from "@/components/call-outcome-form";
import { ConnectionStatus } from "@/components/connection-status";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { LogoutButton } from "@/components/logout-button";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageActor();
  const { id } = await params;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) notFound();
  canAccessLead(user, lead.assigneeId);

  const scoped =
    user.role === "SALESPERSON"
      ? or(eq(leads.assigneeId, user.id), isNull(leads.assigneeId))
      : undefined;

  const [
    activityRows,
    callRows,
    followUpRows,
    meetingRows,
    proposalRows,
    commentRows,
    [nextLead],
    [remainingCountRes],
  ] = await Promise.all([
    db.select().from(activities).where(eq(activities.leadId, id)).orderBy(desc(activities.createdAt)),
    db.select().from(calls).where(eq(calls.leadId, id)).orderBy(desc(calls.occurredAt)),
    db.select().from(followUps).where(eq(followUps.leadId, id)).orderBy(desc(followUps.dueAt)),
    db.select().from(meetings).where(eq(meetings.leadId, id)).orderBy(desc(meetings.startsAt)),
    db.select().from(proposals).where(eq(proposals.leadId, id)).orderBy(desc(proposals.createdAt)),
    db.select().from(comments).where(eq(comments.leadId, id)).orderBy(desc(comments.createdAt)),
    // Next pending uncontacted lead in the same sheet
    db
      .select({ id: leads.id, companyName: leads.companyName })
      .from(leads)
      .where(
        and(
          scoped,
          lead.source ? eq(leads.source, lead.source) : undefined,
          ne(leads.id, lead.id),
          inArray(leads.status, ["NEW", "ASSIGNED"])
        )
      )
      .orderBy(desc(leads.score), desc(leads.createdAt))
      .limit(1),
    // Remaining uncalled count in this sheet
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(
        and(
          scoped,
          lead.source ? eq(leads.source, lead.source) : undefined,
          inArray(leads.status, ["NEW", "ASSIGNED"])
        )
      ),
  ]);

  const remainingInSheet = Number(remainingCountRes?.count ?? 0);
  const backUrl = lead.source ? `/leads?source=${encodeURIComponent(lead.source)}` : "/leads";

  const uploadDateStr = new Date(lead.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const contact = [
    ["Contact", lead.contactName],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Website", lead.website],
    ["Location", lead.location],
    ["Sheet / Source", lead.source || "Direct Entry"],
    ["Date Uploaded / Added", uploadDateStr],
    ["Service interest", lead.serviceInterest],
  ].filter(([, value]) => value);

  const lastCall = callRows[0];
  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>ARKA
        </div>
        <p className="workspace">SALES COMMAND CENTER</p>
        <Link className="nav-item" href="/dashboard">
          ▦ Dashboard
        </Link>
        <Link className="nav-item selected" href="/leads">
          ◫ Leads
        </Link>
        <Link className="nav-item" href="/leads/new">
          ✚ Add Lead
        </Link>
        <Link className="nav-item" href="/import">
          ⇪ Upload Excel
        </Link>
        <div className="sidebar-bottom">
          <div className="profile">
            <span>{initials}</span>
            <div>
              <b>{user.name}</b>
              <small>{user.role.replace("_", " ")}</small>
            </div>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      <main className="workspace-main">
        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link className="link" href={backUrl}>
              ← Back to {lead.source ? lead.source.replace("Sheet: ", "Sheet: ") : "leads"}
            </Link>
            {remainingInSheet > 0 && (
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#edf4f1",
                  color: "#16634b",
                  padding: "4px 9px",
                  borderRadius: "6px",
                  fontWeight: 600,
                }}
              >
                📞 {remainingInSheet} pending {remainingInSheet === 1 ? "lead" : "leads"} to call
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {nextLead && (
              <Link
                href={`/leads/${nextLead.id}`}
                className="button ghost small"
                style={{
                  color: "#16634b",
                  fontWeight: 700,
                  border: "1px solid #16634b",
                  textDecoration: "none",
                }}
                title={`Next pending lead: ${nextLead.companyName}`}
              >
                Next Lead: {nextLead.companyName} →
              </Link>
            )}
            <ConnectionStatus />
            <InstallPwaButton />
            <LogoutButton variant="header" />
          </div>
        </div>

        <header className="detail-header">
          <div>
            <p className="eyebrow">
              {lead.source ? `${lead.source} · ` : ""}SCORE {lead.score}
            </p>
            <h1>{lead.companyName}</h1>
            <p className="muted">{lead.location || "Location not provided"}</p>
          </div>
          <div>
            <span className={`priority ${lead.priority.toLowerCase()}`}>{lead.priority}</span>{" "}
            <span className="stage">{lead.status.replaceAll("_", " ")}</span>
          </div>
        </header>

        <section className="two-column">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Contact and opportunity</h2>
                <span>Imported record</span>
              </div>
            </div>
            <dl className="detail-list">
              {contact.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="next-action">
              <span>NEXT ACTION</span>
              <b>{lead.nextAction || "No next action has been recorded."}</b>
            </div>
            {lead.notes && <p className="empty-note">{lead.notes}</p>}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Contact summary</h2>
                <span>Real call history</span>
              </div>
            </div>
            <div className="record-counts">
              <span>
                Attempts <b>{callRows.length}</b>
              </span>
              <span>
                Last outcome <b>{lastCall?.outcome?.replaceAll("_", " ") || "None"}</b>
              </span>
              <span>
                Last contact{" "}
                <b>{lead.lastContactAt ? lead.lastContactAt.toLocaleDateString() : "Never"}</b>
              </span>
            </div>
            <p className="empty-note">
              Lead response: {lead.leadResponse || "Not recorded"}
              <br />
              Salesperson action: {lead.salespersonAction || "Not recorded"}
              <br />
              Next follow-up: {lead.nextFollowUpAt ? lead.nextFollowUpAt.toLocaleString() : "Not scheduled"}
            </p>
            <CallOutcomeForm
              leadId={lead.id}
              initialNextLeadId={nextLead?.id}
              initialNextLeadCompany={nextLead?.companyName}
              sheetSource={lead.source}
            />
          </div>
        </section>

        <section className="panel lower">
          <div className="panel-head">
            <div>
              <h2>Call attempt history</h2>
              <span>Every attempt is retained</span>
            </div>
          </div>
          {callRows.length ? (
            callRows.map((call, index) => (
              <div className="event" key={call.id}>
                <span className="avatar">{index + 1}</span>
                <div>
                  <p>
                    <b>Attempt #{callRows.length - index}</b> — {call.outcome.replaceAll("_", " ")}
                    {call.interestLevel ? ` · ${call.interestLevel}` : ""}
                  </p>
                  <small>
                    {call.occurredAt.toLocaleString()} · {call.notes || "No notes"}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-note">No call attempts have been recorded yet.</p>
          )}
        </section>

        <section className="panel lower">
          <div className="panel-head">
            <div>
              <h2>Timeline</h2>
              <span>Activity recorded for this lead</span>
            </div>
          </div>
          {activityRows.length ? (
            activityRows.map((activity) => (
              <div className="event" key={activity.id}>
                <span className="avatar">A</span>
                <div>
                  <p>{activity.description}</p>
                  <small>{activity.createdAt.toLocaleString()}</small>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-note">No activities recorded yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
