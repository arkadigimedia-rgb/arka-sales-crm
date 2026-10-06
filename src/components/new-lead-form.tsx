"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./new-lead-form.css";

type UserOption = {
  id: string;
  name: string;
  role: string;
};

export function NewLeadForm({
  users,
  currentUserId,
}: {
  users: UserOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Please provide a School or Company Name.");
      return;
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
        setError(data.error || "Could not save the new lead. Please review the details.");
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
        <p className="eyebrow">DIRECT LEAD ENTRY</p>
        <h1>Add New Lead</h1>
        <p>
          Manually register a school or client opportunity into the CRM. Once created, you can immediately begin logging calls, notes, and scheduled follow-ups.
        </p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <form onSubmit={submit}>
        {/* Section 1: School & Contact Details */}
        <section className="lead-form-section">
          <h3>
            <span>1</span> School / Institution Details
          </h3>
          <div className="lead-grid">
            <label className="lead-label lead-field-full">
              School or Company Name *
              <input
                name="companyName"
                type="text"
                required
                placeholder="e.g. Greenwood High International School"
              />
            </label>

            <label className="lead-label">
              Primary Contact Person
              <small>Principal, Director, or Admin Head</small>
              <input
                name="contactName"
                type="text"
                placeholder="e.g. Dr. Rajesh Sharma"
              />
            </label>

            <label className="lead-label">
              Phone Number
              <small>Mobile or direct office line</small>
              <input
                name="phone"
                type="tel"
                placeholder="e.g. +91 98765 43210"
              />
            </label>

            <label className="lead-label">
              WhatsApp Number
              <small>For WhatsApp brochures / follow-up</small>
              <input
                name="whatsapp"
                type="tel"
                placeholder="e.g. +91 98765 43210"
              />
            </label>

            <label className="lead-label">
              Email Address
              <small>Official or management email</small>
              <input
                name="email"
                type="email"
                placeholder="e.g. principal@greenwood.edu.in"
              />
            </label>

            <label className="lead-label">
              City / Location
              <small>Campus location or city</small>
              <input
                name="location"
                type="text"
                placeholder="e.g. Bangalore, Karnataka"
              />
            </label>

            <label className="lead-label">
              Website URL
              <small>Existing school website</small>
              <input
                name="website"
                type="text"
                placeholder="e.g. https://greenwoodhigh.edu.in"
              />
            </label>
          </div>
        </section>

        {/* Section 2: Opportunity & Services */}
        <section className="lead-form-section">
          <h3>
            <span>2</span> Opportunity & Arka Offerings
          </h3>
          <div className="lead-grid">
            <label className="lead-label">
              Category / Industry
              <select name="industry" defaultValue="School / Education">
                <option value="School / Education">School / K-12 Education</option>
                <option value="College / Higher Education">College / Higher Education</option>
                <option value="Coaching / EdTech">Coaching / Test Prep / EdTech</option>
                <option value="Preschool / Daycare">Preschool / Montessori</option>
                <option value="Corporate / Training">Corporate Training</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="lead-label">
              Recommended Arka Service
              <select name="serviceInterest" defaultValue="Website Redesign & SEO">
                <option value="Website Redesign & SEO">Website Redesign & SEO</option>
                <option value="ERP & School Automation">ERP & School Automation</option>
                <option value="Social Media & Digital Marketing">Social Media & Digital Marketing</option>
                <option value="Lead Generation & Admissions">Lead Generation & Admissions Campaign</option>
                <option value="School CRM Setup">School CRM Setup</option>
                <option value="Branding & Creative Services">Branding & Creative Services</option>
                <option value="Custom Software">Custom Software / App</option>
              </select>
            </label>

            <label className="lead-label">
              Priority Tier
              <select name="priority" defaultValue="MEDIUM">
                <option value="URGENT">URGENT (Tier A - Hot opportunity)</option>
                <option value="HIGH">HIGH (Tier B - High priority)</option>
                <option value="MEDIUM">MEDIUM (Tier C - Standard)</option>
                <option value="LOW">LOW (Tier D - Low urgency)</option>
              </select>
            </label>

            <label className="lead-label">
              Lead Score (0 - 100)
              <input
                name="score"
                type="number"
                min="0"
                max="100"
                defaultValue="60"
              />
            </label>
          </div>
        </section>

        {/* Section 3: Assignment & Action Plan */}
        <section className="lead-form-section">
          <h3>
            <span>3</span> Ownership & Action Plan
          </h3>
          <div className="lead-grid">
            <label className="lead-label">
              Assign Lead To
              <select name="assigneeId" defaultValue={currentUserId}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace("_", " ")})
                  </option>
                ))}
              </select>
            </label>

            <label className="lead-label">
              Initial Next Action
              <input
                name="nextAction"
                type="text"
                placeholder="e.g. Introductory discovery call with Principal"
              />
            </label>

            <label className="lead-label lead-field-full">
              Next Follow-Up Date & Time (optional)
              <input
                name="nextFollowUpAt"
                type="datetime-local"
              />
            </label>

            <label className="lead-label lead-field-full">
              Notes & Requirements (optional)
              <small>Address, existing pain points, referral details, or why they need Arka</small>
              <textarea
                name="notes"
                placeholder="e.g. Current website is outdated, looking for admissions boost for upcoming academic year..."
              />
            </label>
          </div>
        </section>

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
