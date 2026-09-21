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

  function fillCredentials(fillEmail: string, fillPass: string) {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError("");
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

        <div className="login-demo-accounts">
          <p>Quick Access Credentials</p>
          <div className="demo-account-buttons">
            <button
              type="button"
              className="demo-account-btn"
              onClick={() => fillCredentials("admin@arkasales.com", "admin123")}
            >
              <div>
                <b>admin@arkasales.com</b>
                <small>Pass: admin123</small>
              </div>
              <span className="demo-role-badge admin">Admin (Founder)</span>
            </button>

            <button
              type="button"
              className="demo-account-btn"
              onClick={() => fillCredentials("nileshrawat1325@gmail.com", "123456")}
            >
              <div>
                <b>nileshrawat1325@gmail.com</b>
                <small>Pass: 123456</small>
              </div>
              <span className="demo-role-badge sales_head">Sales Head</span>
            </button>

            <button
              type="button"
              className="demo-account-btn"
              onClick={() => fillCredentials("sales@arkasales.com", "123456")}
            >
              <div>
                <b>sales@arkasales.com</b>
                <small>Pass: 123456</small>
              </div>
              <span className="demo-role-badge salesperson">Salesperson</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

