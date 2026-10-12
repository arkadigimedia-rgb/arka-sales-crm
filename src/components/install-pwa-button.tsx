"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone app
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(isAppleDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (isStandalone) {
    return null; // Already installed as standalone app!
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosTip(!showIosTip);
    } else {
      // General prompt or already installable via browser menu
      alert("To install this CRM on your device:\n\n• On Tablet / Phone: Open browser menu (⋮ or ⋯) and tap 'Install App' or 'Add to Home Screen'.\n• On Mac / PC: Click the Install icon (⊕) in the browser address bar.");
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={handleInstall}
        className="button ghost"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.76rem",
          fontWeight: 700,
          padding: "7px 12px",
          borderRadius: "8px",
          border: "1px solid #d5dfda",
          background: "#ffffff",
          color: "#16634b",
          cursor: "pointer",
        }}
        title="Install ARKA Sales CRM on Tablet, Mac, iOS, or Windows"
      >
        <span style={{ fontSize: "0.9rem" }}>📱</span> Install App
      </button>

      {showIosTip && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "8px",
            width: "260px",
            background: "#10251e",
            color: "#ffffff",
            padding: "14px",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            zIndex: 9999,
            fontSize: "0.78rem",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: "6px", color: "#e2c48d" }}>
            Install on iPad / iPhone:
          </div>
          <ol style={{ paddingLeft: "18px", margin: "0 0 10px" }}>
            <li>Tap the <b>Share</b> button in Safari (⎋ / ⬆)</li>
            <li>Scroll down and tap <b>Add to Home Screen</b> (⊞)</li>
            <li>Tap <b>Add</b></li>
          </ol>
          <button
            type="button"
            onClick={() => setShowIosTip(false)}
            style={{
              background: "#16634b",
              color: "#fff",
              border: 0,
              padding: "4px 10px",
              borderRadius: "5px",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
