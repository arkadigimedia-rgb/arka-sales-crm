"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "./connection-status";
import { InstallPwaButton } from "./install-pwa-button";
import { LogoutButton } from "./logout-button";
import { useRealtime } from "./use-realtime";
import type { LiveDashboardData } from "@/server/dashboard";
import "./live-dashboard.css";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LiveDashboard({
  userName,
  userRole,
  initialData,
}: {
  userName: string;
  userRole: string;
  initialData: LiveDashboardData;
}) {
  const [data, setData] = useState<LiveDashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const refreshData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch {
      // keep previous data on network glitch
    } finally {
      setLoading(false);
    }
  };

  useRealtime({
    onEvent: (event) => {
      if (
        event.type === "call:logged" ||
        event.type === "lead:updated" ||
        event.type === "lead:created" ||
        event.type === "leads:imported"
      ) {
        refreshData();
      }
    },
  });

  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const { calls, leads, attention, recentCalls, upcomingMeetings } = data;

  // Max count for weekly bar calculation
  const maxDayCount = Math.max(1, ...calls.thisWeekByDay.map((d) => d.count));
  const maxOutcomeCount = Math.max(
    1,
    ...calls.outcomesAllTime.map((o) => o.count)
  );

  return (
    <div className="command-shell">
      {/* Sidebar */}
      <aside className="command-sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>ARKA
        </div>
        <p>SALES COMMAND CENTER</p>
        <nav>
          <Link className="active" href="/dashboard">
            ▦ Dashboard
          </Link>
          <Link href="/leads">
            ◫ Leads <em>{leads.total}</em>
          </Link>
          <Link href="/leads/new">✚ Add Lead</Link>
          <Link href="/import">⇪ Upload Excel</Link>
          <Link href="/analytics">📊 Analytics</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span>{initials}</span>
            <div>
              <b>{userName}</b>
              <small>{userRole.replace("_", " ")}</small>
            </div>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="command-main">
        {/* Header */}
        <header className="command-header">
          <div>
            <p>ARKA LIVE SALES COMMAND</p>
            <h1>Sales Intelligence Dashboard</h1>
            <small>
              Real-time PostgreSQL connection · Auto-refreshes on live calls & lead updates
            </small>
          </div>
          <div className="command-tools">
            <ConnectionStatus />
            <InstallPwaButton />
            <button
              onClick={refreshData}
              disabled={loading}
              className="button ghost"
              title="Refresh statistics"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <Link className="button" href="/leads/new">
              + Add Lead
            </Link>
            <Link className="button ghost" href="/import">
              Upload Excel
            </Link>
            <LogoutButton variant="header" />
          </div>
        </header>

        {/* Attention Strip */}
        <section className="attention">
          <div>
            <p>ATTENTION REQUIRED</p>
            <h2>Sales pipeline action items</h2>
          </div>
          <div className="attention-items">
            <Link href="/leads?followup=overdue">
              <b>{attention.overdue}</b>
              <span>Overdue Follow-ups</span>→
            </Link>
            <Link href="/leads?attention=no-next-action">
              <b>{attention.noAction}</b>
              <span>Leads Without Next Action</span>→
            </Link>
            <Link href="/leads?status=PROPOSAL_SENT">
              <b>{attention.proposalsWaiting}</b>
              <span>Proposals Awaiting Response</span>→
            </Link>
          </div>
        </section>

        {/* CALLS PERFORMANCE GRID (Daily, Weekly, Monthly, Total) */}
        <section className="command-section">
          <div className="section-heading">
            <div>
              <p>CALL MONITORING</p>
              <h2>Call Performance & Activity</h2>
            </div>
            <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </small>
          </div>

          <div className="calls-metric-grid">
            {/* Daily Calls */}
            <div className="call-card highlight">
              <div className="card-top-tag">DAILY CALLS (TODAY)</div>
              <div className="card-big-num">{calls.today}</div>
              <div className="card-meta">
                <span>⏱ Talk Time: <b>{formatDuration(calls.todayDurationSeconds)}</b></span>
              </div>
              <div className="call-outcomes-pill-list">
                {Object.keys(calls.todayOutcomes).length > 0 ? (
                  Object.entries(calls.todayOutcomes).map(([outcome, count]) => (
                    <span key={outcome} className="outcome-pill">
                      {outcome.replaceAll("_", " ")}: <b>{count}</b>
                    </span>
                  ))
                ) : (
                  <span className="no-calls-pill">No calls logged yet today</span>
                )}
              </div>
            </div>

            {/* Weekly Calls */}
            <div className="call-card">
              <div className="card-top-tag">WEEKLY CALLS (THIS WEEK)</div>
              <div className="card-big-num">{calls.thisWeek}</div>
              <div className="card-meta">
                <span>Calls recorded across the current week</span>
              </div>
              {/* Daily breakdown for current week */}
              <div className="week-mini-bars">
                {calls.thisWeekByDay.map((d) => (
                  <div key={d.day} className="day-col" title={`${d.day}: ${d.count} calls`}>
                    <div className="day-bar-track">
                      <div
                        className="day-bar-fill"
                        style={{ height: `${(d.count / maxDayCount) * 100}%` }}
                      />
                    </div>
                    <span className="day-label">{d.day}</span>
                    <span className="day-val">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Calls */}
            <div className="call-card">
              <div className="card-top-tag">MONTHLY CALLS (THIS MONTH)</div>
              <div className="card-big-num">{calls.thisMonth}</div>
              <div className="card-meta">
                <span>Total call attempts in current month</span>
              </div>
              <div className="call-card-sub">
                <Link href="/leads" className="link">
                  Open Lead Workspace to Start Calling →
                </Link>
              </div>
            </div>

            {/* Total Lifetime Calls */}
            <div className="call-card">
              <div className="card-top-tag">TOTAL RECORDED CALLS</div>
              <div className="card-big-num">{calls.total}</div>
              <div className="card-meta">
                <span>⏱ Cumulative: <b>{formatDuration(calls.totalDurationSeconds)}</b></span>
              </div>
              <div className="call-card-sub">
                <Link href="/analytics" className="link">
                  View Detailed Analytics →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SHEET-WISE LEADS & PIPELINE (Directly solves sheet organization!) */}
        <section className="command-section">
          <div className="dashboard-two-col">
            {/* Sheet-wise Lead Inventory */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">UPLOADED SHEETS & SOURCES</p>
                  <h2>Sheet-Wise Lead Distribution</h2>
                  <span>Click any sheet to filter leads instantly</span>
                </div>
                <Link className="primary" href="/import" style={{ fontSize: "0.75rem", padding: "6px 10px" }}>
                  + Upload New Sheet
                </Link>
              </div>

              <div className="sheet-list">
                {leads.bySheet.length > 0 ? (
                  leads.bySheet.map((item) => (
                    <Link
                      key={item.source}
                      href={`/leads?source=${encodeURIComponent(item.source)}`}
                      className="sheet-row"
                    >
                      <div className="sheet-row-info">
                        <span className="sheet-icon">
                          {item.source.startsWith("Sheet:") ? "📁" : "👤"}
                        </span>
                        <div>
                          <b>{item.source}</b>
                          <small>Click to open leads in this sheet</small>
                        </div>
                      </div>
                      <div className="sheet-row-count">
                        <b>{item.count}</b>
                        <span>leads</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="empty-note">No sheets uploaded yet. Click Upload Excel to add leads.</p>
                )}
              </div>
            </div>

            {/* Sales Pipeline Funnel */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">CONVERSION PIPELINE</p>
                  <h2>Sales Pipeline Stages</h2>
                  <span>Total {leads.total} active leads</span>
                </div>
                <Link className="link" href="/leads">
                  All leads →
                </Link>
              </div>

              <div className="pipeline-bars">
                {leads.pipeline.map((stage) => {
                  const maxPipe = Math.max(1, ...leads.pipeline.map((s) => s.count));
                  const pct = Math.round((stage.count / maxPipe) * 100);
                  return (
                    <Link
                      key={stage.status}
                      href={`/leads?status=${stage.status}`}
                      className="pipe-row"
                    >
                      <div className="pipe-label">
                        <span>{stage.status.replaceAll("_", " ")}</span>
                        <b>{stage.count}</b>
                      </div>
                      <div className="pipe-track">
                        <div className="pipe-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* RECENT CALL LOGS & ACTIVITIES */}
        <section className="command-section">
          <div className="dashboard-two-col">
            {/* Live Calls Log */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">LIVE CALL FEED</p>
                  <h2>Recent Logged Calls</h2>
                  <span>Latest customer touchpoints</span>
                </div>
              </div>

              <div className="recent-calls-list">
                {recentCalls.length > 0 ? (
                  recentCalls.map((c) => (
                    <div key={c.id} className="call-feed-row">
                      <div className="call-feed-main">
                        <Link href={`/leads/${c.leadId}`} className="lead-link">
                          <b>{c.companyName}</b>
                        </Link>
                        <div className="call-feed-meta">
                          <span className={`outcome-tag ${c.outcome.toLowerCase()}`}>
                            {c.outcome.replaceAll("_", " ")}
                          </span>
                          {c.duration ? (
                            <span className="duration-tag">⏱ {formatDuration(c.duration)}</span>
                          ) : null}
                          <span className="caller-tag">👤 {c.callerName || "Sales Rep"}</span>
                          <span className="time-tag">📅 {formatDate(c.occurredAt)}</span>
                        </div>
                        {c.notes && <p className="call-notes">{c.notes}</p>}
                      </div>
                      <Link href={`/leads/${c.leadId}`} className="button ghost small">
                        View Lead
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="empty-note">
                    No calls logged yet. Open any lead and submit the Call Outcome form to log calls.
                  </p>
                )}
              </div>
            </div>

            {/* Upcoming Meetings & Follow-ups */}
            <div className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">SCHEDULED TOUCHPOINTS</p>
                  <h2>Upcoming Meetings & Tasks</h2>
                  <span>Keep momentum alive</span>
                </div>
              </div>

              <div className="meetings-list">
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map((m) => (
                    <div key={m.id} className="meeting-row">
                      <div className="datebox">
                        <b>{new Date(m.startsAt).getDate()}</b>
                        <span>
                          {new Date(m.startsAt).toLocaleDateString("en-IN", {
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="meeting-info">
                        <b>{m.company}</b>
                        <small>
                          {m.type} · {new Date(m.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </small>
                      </div>
                      <span className="status-badge">{m.status}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-note">No meetings scheduled for this period.</p>
                )}

                {/* Call Outcomes All-Time Distribution */}
                <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--line)" }}>
                  <p className="eyebrow">ALL-TIME CALL OUTCOMES</p>
                  <div className="outcomes-breakdown">
                    {calls.outcomesAllTime.map((o) => (
                      <div key={o.outcome} className="outcome-stat-row">
                        <span>{o.outcome.replaceAll("_", " ")}</span>
                        <i>
                          <b style={{ width: `${(o.count / maxOutcomeCount) * 100}%` }} />
                        </i>
                        <em>{o.count}</em>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
