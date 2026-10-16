"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./call-outcome.css";

const options = [
  ["SPOKE", "Spoke"],
  ["NO_ANSWER", "No answer"],
  ["BUSY", "Busy"],
  ["CALL_BACK_LATER", "Call back"],
  ["WRONG_NUMBER", "Wrong number"],
  ["NOT_REACHABLE", "Not reachable"],
  ["OTHER", "Other"],
] as const;

const durationPresets = [
  [15, "15s"],
  [30, "30s"],
  [45, "45s"],
  [60, "1m"],
  [90, "1.5m"],
  [120, "2m"],
  [180, "3m"],
  [300, "5m"],
  [600, "10m"],
] as const;

function formatDuration(sec: number): string {
  if (sec <= 0) return "0s";
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (mins === 0) return `${remSec}s`;
  if (remSec === 0) return `${mins}m (${sec}s)`;
  return `${mins}m ${remSec}s (${sec}s)`;
}

export function CallOutcomeForm({
  leadId,
  initialNextLeadId,
  initialNextLeadCompany,
  sheetSource,
}: {
  leadId: string;
  initialNextLeadId?: string | null;
  initialNextLeadCompany?: string | null;
  sheetSource?: string | null;
}) {
  const [outcome, setOutcome] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [nextTargetId, setNextTargetId] = useState<string | null>(initialNextLeadId || null);
  const [nextTargetCompany, setNextTargetCompany] = useState<string | null>(
    initialNextLeadCompany || null
  );

  const router = useRouter();
  const spoke = outcome === "SPOKE";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosenOutcome = outcome || "OTHER";
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData) as Record<string, string | null>;
    payload.outcome = chosenOutcome;

    for (const key of [
      "leadResponse",
      "interestLevel",
      "salespersonAction",
      "nextAction",
      "nextFollowUpAt",
      "notes",
      "duration",
    ]) {
      if (!payload[key] || (typeof payload[key] === "string" && !payload[key]!.trim())) {
        payload[key] = null;
      }
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/leads/${leadId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      setSaving(false);

      if (!response.ok) {
        return setMessage(body.error || "Could not save call attempt.");
      }

      const nextId = body.nextLeadId || nextTargetId;
      const nextCompany = body.nextLeadCompany || nextTargetCompany;
      const sheet = body.sheetSource || sheetSource;

      if (autoAdvance) {
        if (nextId) {
          setMessage(`✓ Call saved! Loading next lead: ${nextCompany || "Next pending lead"}...`);
          setTimeout(() => {
            router.push(`/leads/${nextId}`);
          }, 600);
        } else {
          setMessage(
            "✓ Call saved! All pending leads in this sheet have been contacted. Returning to leads list..."
          );
          setTimeout(() => {
            const target = sheet ? `/leads?source=${encodeURIComponent(sheet)}` : "/leads";
            router.push(target);
          }, 1000);
        }
      } else {
        setMessage("✓ Call attempt recorded. Lead moved to Contacted.");
        router.refresh();
        form.reset();
        setOutcome("");
        setDuration("");
        if (body.nextLeadId) {
          setNextTargetId(body.nextLeadId);
          setNextTargetCompany(body.nextLeadCompany);
        }
      }
    } catch {
      setSaving(false);
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form className="call-form" onSubmit={submit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Record call outcome</h3>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.72rem",
            color: "#16634b",
            cursor: "pointer",
            fontWeight: 600,
            margin: 0,
          }}
          title="When enabled, saving a call automatically loads the next pending lead to call"
        >
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            style={{ width: "auto", margin: 0 }}
          />
          Auto-load next lead
        </label>
      </div>

      <p>A call attempt moves this lead to Contacted so you can focus on remaining uncalled leads.</p>

      <div className="outcome-buttons">
        {options.map(([value, title]) => (
          <button
            type="button"
            className={outcome === value ? "chosen" : ""}
            onClick={() => setOutcome(value === outcome ? "" : value)}
            key={value}
          >
            {title}
          </button>
        ))}
      </div>

      <div className="duration-section">
        <div className="duration-display-row">
          <span>Duration in seconds (scroller)</span>
          {duration !== "" ? (
            <span className="duration-info">
              <span className="duration-val">{formatDuration(Number(duration))}</span>
              <button
                type="button"
                className="duration-clear"
                onClick={() => setDuration("")}
              >
                Clear
              </button>
            </span>
          ) : (
            <span className="duration-empty">Optional (0s)</span>
          )}
        </div>

        {/* Range scroller for seconds */}
        <input
          type="range"
          min="0"
          max="600"
          step="5"
          value={duration === "" ? 0 : Number(duration)}
          onChange={(e) => setDuration(e.target.value)}
          className="duration-slider"
          aria-label="Call duration scroller in seconds"
        />

        {/* Quick second presets */}
        <div className="duration-presets">
          {durationPresets.map(([sec, label]) => (
            <button
              key={sec}
              type="button"
              className={duration !== "" && Number(duration) === sec ? "chosen" : ""}
              onClick={() => setDuration(String(sec))}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Direct number input */}
        <input
          name="duration"
          type="number"
          min="0"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Or type exact seconds (e.g. 45)"
        />
      </div>

      {spoke && (
        <>
          <label>
            Lead response (optional)
            <input name="leadResponse" placeholder="e.g. Interested in demo / pitched services" />
          </label>
          <label>
            Interest level (optional)
            <select name="interestLevel" defaultValue="">
              <option value="">Select (optional)</option>
              <option value="Interested">Interested</option>
              <option value="Qualified">Qualified</option>
              <option value="Not interested">Not interested</option>
            </select>
          </label>
          <label>
            What you did (optional)
            <input name="salespersonAction" placeholder="e.g. Shared curriculum brochure / pricing" />
          </label>
        </>
      )}

      <label>
        Next action (optional)
        <input name="nextAction" placeholder="e.g. Follow up on Tuesday" />
      </label>
      <label>
        Next follow-up (optional)
        <input name="nextFollowUpAt" type="datetime-local" />
      </label>
      <label>
        Notes (optional)
        <textarea name="notes" placeholder="Call notes or details (optional)" />
      </label>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
        <button className="primary" disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving…" : "Save call attempt & load next"}
        </button>

        {nextTargetId && (
          <button
            type="button"
            className="button ghost small"
            onClick={() => router.push(`/leads/${nextTargetId}`)}
            title={`Skip to ${nextTargetCompany || "next lead"}`}
            style={{ whiteSpace: "nowrap" }}
          >
            Skip →
          </button>
        )}
      </div>

      {message && (
        <div
          className="form-message"
          style={{
            background: message.startsWith("✓") ? "#edf4f1" : "#fde8e5",
            color: message.startsWith("✓") ? "#16634b" : "#b93822",
            padding: "8px 10px",
            borderRadius: "6px",
            marginTop: "10px",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}
