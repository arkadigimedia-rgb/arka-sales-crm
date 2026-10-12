import "./styles.css";
import "./command.css";
import "./details.css";
import "./import/import.css";
import "./dashboard/dashboard.css";
import "./analytics/analytics.css";
import "../components/call-outcome.css";
import "../components/demo-dashboard.css";
import "../components/connection-status.css";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#16634b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "ARKA Sales CRM",
  description: "Internal sales command center",
  applicationName: "ARKA CRM",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARKA CRM",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
