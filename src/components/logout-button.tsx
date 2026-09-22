"use client";

import { useState } from "react";
import "./logout-button.css";

export function LogoutButton({
  className,
  variant = "sidebar",
}: {
  className?: string;
  variant?: "sidebar" | "header";
}) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Fallback
    } finally {
      // Force full page reload to /login to clear all client states
      window.location.href = "/login";
    }
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={`logout-btn header ${className || ""}`}
        title="Sign out of your account"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>{loading ? "Signing out…" : "Log out"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`logout-btn sidebar ${className || ""}`}
      title="Sign out of your account"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span>{loading ? "Signing out…" : "Log out"}</span>
    </button>
  );
}
