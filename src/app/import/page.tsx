"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ImportPage() {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function upload(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const file = new FormData(form).get("file"); if (!(file instanceof File) || !file.size) { setMessage("Choose an Excel file first."); return; } setBusy(true); setMessage(""); const response = await fetch("/api/leads/import", { method: "POST", body: new FormData(form) }); const body = await response.json(); setBusy(false); setMessage(response.ok ? `Import complete: ${body.imported} added, ${body.duplicates} duplicates skipped, ${body.invalid} invalid rows.` : body.error || "The import could not be completed."); }
  return <main className="import-page"><Link className="link" href="/leads">← Back to leads</Link><section className="import-card"><p className="eyebrow">MANUAL DATA IMPORT</p><h1>Upload school leads</h1><p>Choose an Excel file with a <b>School Leads</b> sheet. The importer supports your existing columns such as Business Name, Phone, Email, City, Lead Score, Priority Tier, and Recommended Arka Service.</p><form onSubmit={upload}><label className="upload-drop"><input name="file" type="file" accept=".xlsx,.xls" required /><span>Choose Excel file</span><small>.xlsx or .xls · Maximum 10 MB</small></label><button className="primary" disabled={busy}>{busy ? "Importing…" : "Import leads"}</button></form>{message && <p className="import-message">{message}</p>}<p className="import-note">Duplicate phone numbers, emails, or company + location combinations are skipped, so it is safe to upload an updated sheet.</p></section></main>;
}
