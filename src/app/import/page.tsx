"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ConnectionStatus } from "@/components/connection-status";
import { LogoutButton } from "@/components/logout-button";

interface SheetResult {
  sheetName: string;
  imported: number;
  duplicates: number;
  rows: number;
}

interface ImportResponse {
  imported: number;
  duplicates: number;
  invalid: number;
  totalRows: number;
  sheets?: SheetResult[];
  error?: string;
}

export default function ImportPage() {
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");

    if (!(file instanceof File) || !file.size) {
      setErrorMsg("Choose an Excel file first.");
      return;
    }

    setBusy(true);
    setErrorMsg("");
    setResult(null);

    try {
      const response = await fetch("/api/leads/import", {
        method: "POST",
        body: new FormData(form),
      });
      const body = await response.json();
      setBusy(false);

      if (!response.ok) {
        setErrorMsg(body.error || "The import could not be completed.");
      } else {
        setResult(body);
      }
    } catch (err: unknown) {
      setBusy(false);
      setErrorMsg(err instanceof Error ? err.message : "Network error during upload.");
    }
  }

  return (
    <main className="import-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
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

      <section className="import-card">
        <p className="eyebrow">SHEET-WISE DATA IMPORTER</p>
        <h1>Upload Excel Leads</h1>
        <p>
          Upload your lead sheets (.xlsx or .xls). Each sheet in your workbook is automatically organized and tagged so you can filter and work on your leads <b>sheet-by-sheet</b> without mixing them up.
        </p>

        <form onSubmit={upload}>
          {/* Optional Sheet Label Override */}
          <div style={{ marginBottom: "16px", textAlign: "left" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "6px" }}>
              Custom Sheet / Campaign Label (Optional)
            </label>
            <input
              type="text"
              name="sheetLabel"
              placeholder="e.g. Hassan Interiors Oct 2026 (Leave blank to use Excel sheet name)"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                fontSize: "0.84rem",
              }}
            />
            <small style={{ color: "var(--muted)", fontSize: "0.74rem", display: "block", marginTop: "4px" }}>
              If left blank, the app will automatically name the leads after the worksheet (e.g. <code>Sheet: School Leads</code>).
            </small>
          </div>

          <label className="upload-drop">
            <input name="file" type="file" accept=".xlsx,.xls" required />
            <span>Choose Excel file</span>
            <small>.xlsx or .xls · Multi-sheet supported · Max 15 MB</small>
          </label>

          <button className="primary" disabled={busy} style={{ width: "100%", marginTop: "14px" }}>
            {busy ? "Importing & Organizing Sheets…" : "Import Leads Sheet-Wise"}
          </button>
        </form>

        {errorMsg && (
          <p className="import-message" style={{ background: "#fde8e5", color: "#b93822" }}>
            {errorMsg}
          </p>
        )}

        {result && (
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "#edf4f1",
              border: "1px solid #c9ded6",
              borderRadius: "9px",
              textAlign: "left",
            }}
          >
            <b style={{ color: "#16634b", fontSize: "0.95rem" }}>
              ✓ Import Complete: {result.imported} leads added!
            </b>
            <p style={{ margin: "4px 0 12px", fontSize: "0.8rem", color: "#3a564c" }}>
              {result.duplicates} duplicate numbers/emails skipped · {result.invalid} invalid rows.
            </p>

            {result.sheets && result.sheets.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16634b" }}>
                  SHEETS PROCESSED:
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  {result.sheets.map((s) => (
                    <div
                      key={s.sheetName}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: "#ffffff",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                      }}
                    >
                      <span>📁 <b>{s.sheetName}</b></span>
                      <span>
                        <b style={{ color: "#16634b" }}>{s.imported}</b> added ({s.duplicates} duplicates)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <Link className="primary" href="/leads" style={{ fontSize: "0.82rem", textDecoration: "none" }}>
                Open Leads Workspace →
              </Link>
              <Link className="button ghost" href="/dashboard" style={{ fontSize: "0.82rem", textDecoration: "none" }}>
                View Dashboard
              </Link>
            </div>
          </div>
        )}

        <p className="import-note" style={{ marginTop: "16px" }}>
          Safe to re-upload: Existing phone numbers or email combinations are automatically deduplicated.
        </p>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "18px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <b style={{ fontSize: "0.88rem" }}>Adding a single lead individually?</b>
            <p style={{ margin: "3px 0 0", fontSize: "0.78rem", color: "var(--muted)" }}>
              Add a lead directly with date & source tracking without needing an Excel sheet.
            </p>
          </div>
          <Link className="primary" href="/leads/new">
            + Add Single Lead
          </Link>
        </div>
      </section>
    </main>
  );
}
