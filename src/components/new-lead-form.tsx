"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./new-lead-form.css";

const commonServices = [
  "Website Redesign & SEO",
  "Social Media & Digital Marketing",
  "Lead Generation Campaign",
  "ERP & School Automation",
  "Business CRM Setup",
  "Branding & Creative Services",
  "Custom Software / Web App",
] as const;

const commonResponses = [
  "We will reach out",
  "Interested in demo",
  "Pitched for lead generation",
  "Call back later",
  "Requested proposal & pricing",
  "Not interested at the moment",
] as const;

const commonSources = [
  "Meta Lead",
  "Cold Calling",
  "Website / Inbound",
  "Referral",
  "WhatsApp",
  "Other",
] as const;

export function NewLeadForm({
  currentUserId,
}: {
  users?: { id: string; name: string; role: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("Meta Lead");
  const [leadResponse, setLeadResponse] = useState("");
  const [showMore, setShowMore] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form) as Record<string, string | null>;

    // Clean up empty strings
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string" && !value.trim()) {
        payload[key] = null;
      }
    }

    if (!payload.companyName) {
      setError("Please provide a Business Name.");
      return;
    }

    // Default assignee to current user if not chosen
    if (!payload.assigneeId) {
      payload.assigneeId = currentUserId;
    }
    if (!payload.source) {
      payload.source = source || "Meta Lead";
    }

    setSaving(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setSaving(false);

      if (!response.ok) {
        setError(data.error || "Could not save the lead. Please check the details.");
        return;
      }

      // Successfully created -> redirect straight to the lead workspace
      router.push(`/leads/${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "An unexpected network error occurred.");
    }
  }

  return (
    <div className="new-lead-card">
      <div className="new-lead-header">
        <p className="eyebrow">QUICK LEAD ENTRY</p>
        <h1>Add New Lead</h1>
        <p>
          Enter the business name, contact number, lead type, service required, and initial response.
        </p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <form onSubmit={submit}>
        <div className="lead-fields-stack">
          {/* 1. Business Name */}
          <label className="lead-label">
            Business Name *
            <input
              name="companyName"
              type="text"
              required
              autoFocus
              placeholder="e.g. Greenwood Enterprises, Delhi Public School..."
            />
          </label>

          {/* 2. Number */}
          <label className="lead-label">
            Phone Number
            <input
              name="phone"
              type="tel"
              placeholder="e.g. +91 98765 43210"
            />
          </label>

          {/* 3. Lead Type / Source */}
          <label className="lead-label">
            Lead Type / Source
            <div className="source-chips">
              {commonSources.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`source-chip ${source === s ? "chosen" : ""}`}
                  onClick={() => setSource(s)}
                >
                  {s === "Meta Lead" ? "🎯 Meta Lead" : s === "Cold Calling" ? "📞 Cold Calling" : s}
                </button>
              ))}
            </div>
            <input
              name="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Or specify custom source..."
            />
          </label>

          {/* 4. Service Required */}
          <label className="lead-label">
            Service Required
            <input
              name="serviceInterest"
              type="text"
              list="services-options"
              placeholder="e.g. Website Redesign & SEO, Digital Marketing..."
            />
            <datalist id="services-options">
              {commonServices.map((service) => (
                <option key={service} value={service} />
              ))}
            </datalist>
          </label>

          {/* 4. Response */}
          <label className="lead-label">
            Lead Response
            <textarea
              name="leadResponse"
              value={leadResponse}
              onChange={(e) => setLeadResponse(e.target.value)}
              placeholder="e.g. We will reach out, Interested in demo, Pitched for lead generation..."
            />
            <div className="response-chips">
              {commonResponses.map((res) => (
                <button
                  key={res}
                  type="button"
                  className="response-chip"
                  onClick={() => setLeadResponse(res)}
                >
                  {res}
                </button>
              ))}
            </div>
          </label>

          {/* Optional additional details toggle */}
          <div>
            <button
              type="button"
              className="optional-toggle"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "− Hide additional options" : "+ Additional options (Follow-up & Notes)"}
            </button>

            {showMore && (
              <div className="optional-box">
                <label className="lead-label">
                  Next Follow-up Date & Time (optional)
                  <input name="nextFollowUpAt" type="datetime-local" />
                </label>

                <label className="lead-label">
                  Notes (optional)
                  <textarea
                    name="notes"
                    placeholder="Any extra details or discussion notes..."
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions-bar">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving Lead…" : "Save & Open Lead →"}
          </button>
          <Link href="/leads" className="button-cancel">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
