import "./styles.css";
import "./command.css";
import "./details.css";
import "./import/import.css";
import "./dashboard/dashboard.css";
import "./analytics/analytics.css";
import "../components/call-outcome.css";
import "../components/demo-dashboard.css";
import "../components/connection-status.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "ARKA Sales", description: "Internal sales workspace" };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
