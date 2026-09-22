import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { pageActor, canAccessLead } from "@/server/auth";
import { db } from "@/server/db";
import { activities, calls, comments, followUps, leads, meetings, proposals } from "@/server/schema";
import { CallOutcomeForm } from "@/components/call-outcome-form";
import { ConnectionStatus } from "@/components/connection-status";
import { LogoutButton } from "@/components/logout-button";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageActor(); const { id } = await params;
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) notFound(); canAccessLead(user, lead.assigneeId);
  const [activityRows, callRows, followUpRows, meetingRows, proposalRows, commentRows] = await Promise.all([
    db.select().from(activities).where(eq(activities.leadId, id)).orderBy(desc(activities.createdAt)),
    db.select().from(calls).where(eq(calls.leadId, id)).orderBy(desc(calls.occurredAt)),
    db.select().from(followUps).where(eq(followUps.leadId, id)).orderBy(desc(followUps.dueAt)),
    db.select().from(meetings).where(eq(meetings.leadId, id)).orderBy(desc(meetings.startsAt)),
    db.select().from(proposals).where(eq(proposals.leadId, id)).orderBy(desc(proposals.createdAt)),
    db.select().from(comments).where(eq(comments.leadId, id)).orderBy(desc(comments.createdAt)),
  ]);
  const contact = [["Contact", lead.contactName], ["Phone", lead.phone], ["Email", lead.email], ["Website", lead.website], ["Location", lead.location], ["Source", lead.source], ["Service interest", lead.serviceInterest]].filter(([, value]) => value);
  const lastCall = callRows[0];
  const initials = user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>ARKA
        </div>
        <p className="workspace">SALES COMMAND CENTER</p>
        <Link className="nav-item" href="/dashboard">▦ Dashboard</Link>
        <Link className="nav-item selected" href="/leads">◫ Leads</Link>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <Link className="link" href="/leads">← Back to leads</Link>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <ConnectionStatus />
            <LogoutButton variant="header" />
          </div>
        </div>
        <header className="detail-header">
          <div>
            <p className="eyebrow">SCHOOL LEAD · SCORE {lead.score}</p>
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
            <dl className="detail-list">{contact.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
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
              <span>Attempts <b>{callRows.length}</b></span>
              <span>Last outcome <b>{lastCall?.outcome?.replaceAll("_", " ") || "None"}</b></span>
              <span>Last contact <b>{lead.lastContactAt ? lead.lastContactAt.toLocaleDateString() : "Never"}</b></span>
            </div>
            <p className="empty-note">
              Lead response: {lead.leadResponse || "Not recorded"}<br/>
              Salesperson action: {lead.salespersonAction || "Not recorded"}<br/>
              Next follow-up: {lead.nextFollowUpAt ? lead.nextFollowUpAt.toLocaleString() : "Not scheduled"}
            </p>
            <CallOutcomeForm leadId={lead.id}/>
          </div>
        </section>
        <section className="panel lower">
          <div className="panel-head">
            <div>
              <h2>Call attempt history</h2>
              <span>Every attempt is retained</span>
            </div>
          </div>
          {callRows.length ? callRows.map((call, index) => (
            <div className="event" key={call.id}>
              <span className="avatar">{index + 1}</span>
              <div>
                <p><b>Attempt #{callRows.length - index}</b> — {call.outcome.replaceAll("_", " ")}{call.interestLevel ? ` · ${call.interestLevel}` : ""}</p>
                <small>{call.occurredAt.toLocaleString()} · {call.notes || "No notes"}</small>
              </div>
            </div>
          )) : <p className="empty-note">No call attempts have been recorded yet.</p>}
        </section>
        <section className="panel lower">
          <div className="panel-head">
            <div>
              <h2>Timeline</h2>
              <span>Activity recorded for this lead</span>
            </div>
          </div>
          {activityRows.length ? activityRows.map(item => (
            <div className="event" key={item.id}>
              <span className="avatar">A</span>
              <div>
                <p>{item.description}</p>
                <small>{item.createdAt.toLocaleString()}</small>
              </div>
            </div>
          )) : <p className="empty-note">No activity has been recorded yet.</p>}
        </section>
      </main>
    </div>
  );
}
