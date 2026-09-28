"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
const options = [["SPOKE", "Spoke"], ["NO_ANSWER", "No answer"], ["BUSY", "Busy"], ["CALL_BACK_LATER", "Call back"], ["WRONG_NUMBER", "Wrong number"], ["NOT_REACHABLE", "Not reachable"], ["OTHER", "Other"]] as const;
export function CallOutcomeForm({ leadId }: { leadId: string }) {
  const [outcome, setOutcome] = useState<string>("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const spoke = outcome === "SPOKE";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosenOutcome = outcome || "OTHER";
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form) as Record<string, string | null>;
    payload.outcome = chosenOutcome;

    for (const key of ["leadResponse", "interestLevel", "salespersonAction", "nextAction", "nextFollowUpAt", "notes", "duration"]) {
      if (!payload[key] || (typeof payload[key] === "string" && !payload[key].trim())) {
        payload[key] = null;
      }
    }

    setSaving(true);
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

    setMessage("Call attempt saved.");
    router.refresh();
    event.currentTarget.reset();
    setOutcome("");
  }

  return (
    <form className="call-form" onSubmit={submit}>
      <h3>Record call outcome</h3>
      <p>A call only counts as contact after you save its actual result.</p>
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
      <label>
        Duration in seconds (optional)
        <input name="duration" type="number" min="0" placeholder="e.g. 60" />
      </label>
      {spoke && (
        <>
          <label>
            Lead response (optional)
            <input name="leadResponse" placeholder="e.g. Interested in demo" />
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
            <input name="salespersonAction" placeholder="e.g. Shared curriculum brochure" />
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
      <button className="primary" disabled={saving}>
        {saving ? "Saving…" : "Save call attempt"}
      </button>
      {message && <span className="form-message">{message}</span>}
    </form>
  );
}
