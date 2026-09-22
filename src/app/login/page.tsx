"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectionStatus } from "@/components/connection-status";
import "./login.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!r.ok) {
      setError("Invalid email or password.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login">
      <section>
        <div className="login-header-row">
          <div className="brand">
            <span className="brand-mark">A</span>ARKA
          </div>
          <ConnectionStatus />
        </div>

        <p className="eyebrow">INTERNAL SALES CRM</p>
        <h1>Welcome back</h1>
        <p>Sign in to manage your sales operation.</p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="name@arkasales.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

