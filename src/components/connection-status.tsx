"use client";

import { useEffect, useState, useCallback } from "react";
import "./connection-status.css";

interface HealthData {
  status: "healthy" | "degraded";
  database: {
    connected: boolean;
    latencyMs: number | null;
    error?: string;
  };
  timestamp: string;
}

export function ConnectionStatus() {
  const [data, setData] = useState<HealthData | null>(null);
  const [checking, setChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const json: HealthData = await res.json();
      setData(json);
    } catch (err) {
      setData({
        status: "degraded",
        database: {
          connected: false,
          latencyMs: null,
          error: err instanceof Error ? err.message : "Network error reaching server",
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkConnection();
    }, 0);
    const interval = setInterval(() => {
      void checkConnection();
    }, 15000);
    const handleFocus = () => {
      void checkConnection();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
    };
  }, [checkConnection]);

  const isConnected = data?.database.connected ?? null;
  const latency = data?.database.latencyMs;

  const getStatusClass = () => {
    if (checking) return "checking";
    if (isConnected === true) return latency && latency > 500 ? "degraded" : "connected";
    if (isConnected === false) return "disconnected";
    return "checking";
  };

  const getStatusLabel = () => {
    if (checking) return "Checking DB...";
    if (isConnected === true) {
      return latency != null ? `DB Live · ${latency}ms` : "DB Connected";
    }
    if (isConnected === false) return "DB Disconnected";
    return "Checking DB...";
  };

  return (
    <>
      {isConnected === false && (
        <div className="connection-banner" role="alert">
          <div>
            ⚠️ <b>Database Offline:</b> Unable to connect to PostgreSQL backend.{" "}
            {data?.database.error ? `(${data.database.error})` : "Check connection string or service."}
          </div>
          <button onClick={checkConnection} disabled={checking}>
            {checking ? "Checking..." : "Retry Connection"}
          </button>
        </div>
      )}

      <div
        className="connection-status-badge"
        onClick={() => setShowDetails((prev) => !prev)}
        title={data?.database.error || `Database is ${isConnected ? "connected" : "checking"}`}
      >
        <span className={`status-dot ${getStatusClass()}`} />
        <span>{getStatusLabel()}</span>
        {showDetails && (
          <span style={{ fontSize: "10px", opacity: 0.8, marginLeft: "4px" }}>
            (Click to retry)
          </span>
        )}
      </div>
    </>
  );
}
