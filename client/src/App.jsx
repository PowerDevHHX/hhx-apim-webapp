import React, { useState } from "react";
import { ChartNoAxesCombined, KeyRound } from "lucide-react";
import Dashboard from "./pages/Dashboard.jsx";
import Onboarding from "./pages/Onboarding.jsx";

const NAV_STYLE = {
  display: "flex",
  gap: "1px",
  background: "#1c1f26",
  borderBottom: "1px solid #30363d",
  padding: "0 24px",
};

const TAB_STYLE = (active) => ({
  padding: "14px 20px",
  background: "none",
  border: "none",
  color: active ? "#58a6ff" : "#8b949e",
  borderBottom: active ? "2px solid #58a6ff" : "2px solid transparent",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: active ? 600 : 400,
  transition: "color 0.15s",
});

const HEADER_STYLE = {
  background: "#161b22",
  borderBottom: "1px solid #30363d",
  padding: "16px 24px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117" }}>
      <header style={HEADER_STYLE}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #58a6ff, #bc8cff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: "0.04em"
        }}>
          HHX
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f6fc" }}>
            APIM HHX Gateway
          </div>
          <div style={{ fontSize: 12, color: "#8b949e" }}>
            Early web UI shell · design-matched from hhx-gateway-apim-main
          </div>
        </div>
      </header>

      <nav style={NAV_STYLE}>
        <button style={{ ...TAB_STYLE(tab === "dashboard"), display: "flex", alignItems: "center", gap: 6 }} onClick={() => setTab("dashboard")}>
          <ChartNoAxesCombined size={15} /> Usage Dashboard
        </button>
        <button style={{ ...TAB_STYLE(tab === "onboarding"), display: "flex", alignItems: "center", gap: 6 }} onClick={() => setTab("onboarding")}>
          <KeyRound size={15} /> Manage API Keys
        </button>
      </nav>

      <main style={{ padding: "24px" }}>
        {tab === "dashboard" && <Dashboard />}
        {tab === "onboarding" && <Onboarding />}
      </main>
    </div>
  );
}
