import Link from "next/link";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { pageActor } from "@/server/auth";
import { db } from "@/server/db";
import { leads } from "@/server/schema";
import { ConnectionStatus } from "@/components/connection-status";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { LogoutButton } from "@/components/logout-button";
import "./leads.css";

function formatLeadDate(dateVal: Date | string | null): string {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    return isToday ? `Today, ${timeStr}` : `${dateStr}`;
  } catch {
    return "";
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    attention?: string;
    source?: string;
    view?: string;
    q?: string;
  }>;
}) {
  const user = await pageActor();
  const filters = await searchParams;

  const baseUserScope =
    user.role === "SALESPERSON"
      ? or(eq(leads.assigneeId, user.id), isNull(leads.assigneeId))
      : undefined;

  // 1. Fetch source counts to build sheet-wise selector
  const sourceGroups = await db
    .select({
      source: sql<string>`coalesce(${leads.source}, 'Unassigned')`,
      count: sql<number>`count(*)`,
    })
    .from(leads)
    .where(baseUserScope)
    .groupBy(leads.source)
    .orderBy(desc(sql<number>`count(*)`));

  const totalLeadsCount = sourceGroups.reduce((acc, s) => acc + Number(s.count), 0);

  // 2. Determine base sheet conditions for calculating sub-tab counts
  const sheetConditions = [baseUserScope];
  if (filters.source) {
    if (filters.source === "Unassigned") {
      sheetConditions.push(isNull(leads.source));
    } else {
      sheetConditions.push(eq(leads.source, filters.source));
    }
  }

  const [tabCounts] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${leads.status} in ('NEW', 'ASSIGNED'))`,
      contacted: sql<number>`count(*) filter (where ${leads.status} = 'CONTACTED')`,
      needsAction: sql<number>`count(*) filter (where ${leads.nextAction} is null and ${leads.status} not in ('WON', 'LOST'))`,
      interested: sql<number>`count(*) filter (where ${leads.status} in ('INTERESTED', 'QUALIFIED'))`,
      total: sql<number>`count(*)`,
    })
    .from(leads)
    .where(and(...sheetConditions));

  const pendingCount = Number(tabCounts?.pending ?? 0);
  const contactedCount = Number(tabCounts?.contacted ?? 0);
  const needsActionCount = Number(tabCounts?.needsAction ?? 0);
  const interestedCount = Number(tabCounts?.interested ?? 0);
  const currentSheetTotal = Number(tabCounts?.total ?? 0);

  // 3. View Mode:
  // - Default is "pending" (Uncalled queue: NEW + ASSIGNED) -> contacted leads VANISH from here!
  // - "contacted": shows only contacted leads
  // - "needs-action": shows leads without next action
  // - "interested": shows interested leads
  // - "all": complete history of all leads
  const isContacted = filters.status === "CONTACTED";
  const isInterested = filters.status === "INTERESTED";
  const isNeedsAction = filters.attention === "no-next-action";
  const isViewAll = filters.view === "all";
  const isOtherStatus = Boolean(filters.status && !isContacted && !isInterested);
  const isPending = !isContacted && !isInterested && !isNeedsAction && !isViewAll && !isOtherStatus;

  // 4. Build query conditions
  const conditions = [...sheetConditions];

  if (isPending) {
    // Only pending uncalled leads! Contacted leads vanish from this view!
    conditions.push(inArray(leads.status, ["NEW", "ASSIGNED"]));
  } else if (isContacted) {
    conditions.push(eq(leads.status, "CONTACTED"));
  } else if (isInterested) {
    conditions.push(inArray(leads.status, ["INTERESTED", "QUALIFIED"]));
  } else if (isNeedsAction) {
    conditions.push(isNull(leads.nextAction));
  } else if (filters.status) {
    conditions.push(eq(leads.status, filters.status as typeof leads.status.enumValues[number]));
  }
  // If isViewAll is true, no status condition is added so everything is returned

  if (filters.q) {
    const query = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(leads.companyName, query),
        ilike(leads.contactName, query),
        ilike(leads.phone, query),
        ilike(leads.email, query),
        ilike(leads.location, query)
      )
    );
  }

  const where = and(...conditions);
  const rows = await db
    .select()
    .from(leads)
    .where(where)
    .orderBy(desc(leads.score), desc(leads.updatedAt));

  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const isFilteringBySource = Boolean(filters.source);
  const sourceParam = filters.source ? `&source=${encodeURIComponent(filters.source)}` : "";
  const sourceOnlyParam = filters.source ? `?source=${encodeURIComponent(filters.source)}` : "";

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>ARKA
        </div>
        <p className="workspace">SALES COMMAND CENTER</p>
        <Link className="nav-item" href="/dashboard">
          ▦ Dashboard
        </Link>
        <Link className="nav-item selected" href="/leads">
          ◫ Leads <em>{totalLeadsCount}</em>
        </Link>
        <Link className="nav-item" href="/leads/new">
          ✚ Add Lead
        </Link>
        <Link className="nav-item" href="/import">
          ⇪ Upload Excel
        </Link>
        <Link className="nav-item" href="/analytics">
          📊 Analytics
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

      {/* Main Workspace */}
      <main className="workspace-main">
        <header>
          <div>
            <p className="eyebrow">BUSINESS LEADS & WORKSHEETS</p>
            <h1>Lead workspace</h1>
          </div>
          <div className="header-actions">
            <ConnectionStatus />
            <InstallPwaButton />
            <Link className="link" href="/dashboard">
              Dashboard
            </Link>
            <Link className="primary" href="/leads/new">
              + Add Lead
            </Link>
            <Link className="link" href="/import">
              Upload Excel
            </Link>
            <LogoutButton variant="header" />
          </div>
        </header>

        {/* SHEET-WISE FILTER TABS */}
        <section className="sheet-selector-panel">
          <div className="sheet-selector-header">
            <div>
              <span className="sheet-selector-title">SHEET-WISE FILTER</span>
              <p className="sheet-selector-subtitle">
                Select a sheet below to view and work on leads sheet-by-sheet:
              </p>
            </div>
            {isFilteringBySource && (
              <Link href="/leads" className="sheet-clear-link">
                ✕ Clear Sheet Filter
              </Link>
            )}
          </div>

          <div className="sheet-chips-scroll">
            {/* All Leads Pill */}
            <Link
              href="/leads"
              className={`sheet-chip ${!filters.source ? "active" : ""}`}
            >
              <span className="chip-icon">🗂</span>
              <span className="chip-name">All Sheets & Sources</span>
              <span className="chip-count">{totalLeadsCount}</span>
            </Link>

            {/* Individual Sheet / Source Pills */}
            {sourceGroups.map((group) => {
              const isSelected = filters.source === group.source;
              const isSheet = group.source.startsWith("Sheet:");
              const displayName = group.source.replace("Sheet: ", "");

              return (
                <Link
                  key={group.source}
                  href={`/leads?source=${encodeURIComponent(group.source)}`}
                  className={`sheet-chip ${isSelected ? "active" : ""}`}
                >
                  <span className="chip-icon">{isSheet ? "📁" : "👤"}</span>
                  <span className="chip-name">{displayName}</span>
                  <span className="chip-count">{group.count}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Main Leads Table Panel */}
        <section className="panel full">
          <div className="list-top">
            <div>
              <h2>
                {isPending && (
                  <>
                    {rows.length} pending {rows.length === 1 ? "lead" : "leads"} to call
                    {filters.source ? ` in ${filters.source.replace("Sheet: ", "")}` : ""}
                  </>
                )}
                {isContacted && (
                  <>
                    {rows.length} contacted {rows.length === 1 ? "lead" : "leads"}
                    {filters.source ? ` in ${filters.source.replace("Sheet: ", "")}` : ""}
                  </>
                )}
                {isInterested && (
                  <>
                    {rows.length} interested {rows.length === 1 ? "lead" : "leads"}
                    {filters.source ? ` in ${filters.source.replace("Sheet: ", "")}` : ""}
                  </>
                )}
                {isNeedsAction && (
                  <>
                    {rows.length} leads requiring attention
                    {filters.source ? ` in ${filters.source.replace("Sheet: ", "")}` : ""}
                  </>
                )}
                {isViewAll && (
                  <>
                    {rows.length} total leads (complete history)
                    {filters.source ? ` in ${filters.source.replace("Sheet: ", "")}` : ""}
                  </>
                )}
              </h2>
              <p>
                {isPending
                  ? "Active calling queue. Once a lead is called, it automatically moves to the Contacted list and vanishes from here."
                  : isContacted
                  ? "All leads that have been contacted or attempted."
                  : isInterested
                  ? "Leads who expressed positive interest in ARKA services."
                  : isNeedsAction
                  ? "Leads requiring immediate follow-up or next action definition."
                  : "Complete lead directory including both pending and contacted records."}
              </p>
            </div>
          </div>

          {/* Sub Filters / Tabs with dynamic counts */}
          <div className="lead-queue-tabs">
            {/* 1. Pending to Call (Default) */}
            <Link
              className={`queue-tab ${isPending ? "active" : ""}`}
              href={sourceOnlyParam ? `/leads${sourceOnlyParam}` : "/leads"}
              title="Only leads waiting to be called. Contacted leads vanish from this list."
            >
              📞 To Call / Pending <b>{pendingCount}</b>
            </Link>

            {/* 2. Contacted Tab */}
            <Link
              className={`queue-tab ${isContacted ? "active" : ""}`}
              href={`/leads?status=CONTACTED${sourceParam}`}
              title="All leads that have been contacted or attempted"
            >
              ✓ Contacted <b>{contactedCount}</b>
            </Link>

            {/* 3. Needs Action Tab */}
            <Link
              className={`queue-tab ${isNeedsAction ? "active" : ""}`}
              href={`/leads?attention=no-next-action${sourceParam}`}
              title="Leads missing next actions"
            >
              ⚠️ Needs Action <b>{needsActionCount}</b>
            </Link>

            {/* 4. Interested Tab */}
            <Link
              className={`queue-tab ${isInterested ? "active" : ""}`}
              href={`/leads?status=INTERESTED${sourceParam}`}
              title="Interested prospects"
            >
              🎯 Interested <b>{interestedCount}</b>
            </Link>

            {/* 5. All History Tab */}
            <Link
              className={`queue-tab ${isViewAll ? "active" : ""}`}
              href={`/leads?view=all${sourceParam}`}
              title="Complete history of all leads (both pending and contacted)"
            >
              🗂 All History <b>{currentSheetTotal}</b>
            </Link>

            <span className="queue-hint">Prioritised by score — click Open to call or review.</span>
          </div>

          {/* Table */}
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th style={{ minWidth: "260px" }}>BUSINESS LEAD & SHEET</th>
                  <th style={{ minWidth: "200px" }}>CONTACT</th>
                  <th>STAGE</th>
                  <th>PRIORITY</th>
                  <th style={{ minWidth: "180px" }}>NEXT ACTION</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => {
                  const isSheet = lead.source?.startsWith("Sheet:");
                  const uploadDateStr = formatLeadDate(lead.createdAt);

                  return (
                    <tr key={lead.id} className="lead-table-row">
                      {/* Lead Name, Sheet Tag, Upload Date */}
                      <td>
                        <div className="lead-title-row">
                          <b className="lead-company-name">{lead.companyName}</b>
                          {lead.source && (
                            <span
                              className={`source-badge ${isSheet ? "sheet-source" : "single-source"}`}
                              title={`Source: ${lead.source}`}
                            >
                              {isSheet ? "📁 " : "👤 "}
                              {lead.source.replace("Sheet: ", "")}
                            </span>
                          )}
                        </div>
                        <div className="lead-meta-row">
                          <span className="lead-location">
                            {lead.location || "Location not provided"}
                          </span>
                          <span className="lead-dot">·</span>
                          <span className="lead-score">Score {lead.score}</span>
                          {uploadDateStr && (
                            <>
                              <span className="lead-dot">·</span>
                              <span className="lead-date-badge" title={`Created / Uploaded on ${uploadDateStr}`}>
                                📅 {uploadDateStr}
                              </span>
                            </>
                          )}
                        </div>
                        {lead.serviceInterest && (
                          <div className="lead-service-tag">
                            🎯 {lead.serviceInterest}
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td>
                        <b>{lead.contactName}</b>
                        <small>{lead.phone || lead.email || "No contact method"}</small>
                        {lead.phone && (
                          <div className="contact-quick-links">
                            <a href={`tel:${lead.phone}`} className="quick-action-link" title="Call">
                              📞 Call
                            </a>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="quick-action-link wa"
                              title="WhatsApp"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Stage */}
                      <td>
                        <span className="stage">{lead.status.replaceAll("_", " ")}</span>
                      </td>

                      {/* Priority */}
                      <td>
                        <span className={`priority ${lead.priority.toLowerCase()}`}>
                          {lead.priority}
                        </span>
                      </td>

                      {/* Next Action */}
                      <td>
                        <span className={lead.nextAction ? "has-next-action" : "no-next-action"}>
                          {lead.nextAction || "Needs a next action"}
                        </span>
                      </td>

                      {/* Open Action */}
                      <td>
                        <Link className="open-lead-btn" href={`/leads/${lead.id}`}>
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="empty-leads-view">
              <p className="empty-note">
                {isPending ? (
                  <>
                    🎉 <b>All leads in this view have been contacted!</b>
                    <br />
                    Check the{" "}
                    <Link
                      href={`/leads?status=CONTACTED${sourceParam}`}
                      className="link"
                      style={{ fontWeight: 700 }}
                    >
                      Contacted list ({contactedCount})
                    </Link>{" "}
                    or pick another sheet above.
                  </>
                ) : (
                  <>
                    No leads found in this view.{" "}
                    <Link href="/leads" className="link">
                      View all sheets
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
