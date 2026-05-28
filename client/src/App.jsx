import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChartNoAxesCombined, KeyRound, Lock, LogOut } from "lucide-react";
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
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const cardStyle = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: 16,
  padding: "28px",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: 10,
  color: "#f0f6fc",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #30363d",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post("/api/auth/login", form);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1b2332 0%, #0d1117 48%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "linear-gradient(135deg, #58a6ff, #bc8cff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            HHX
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f0f6fc" }}>APIM HHX Gateway</div>
            <div style={{ fontSize: 12, color: "#8b949e" }}>Static admin login</div>
          </div>
        </div>

        <div style={{ color: "#8b949e", fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
          This dashboard is now protected by a single shared username/password.
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 6 }}>Username</div>
            <input
              style={inputStyle}
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 6 }}>Password</div>
            <input
              type="password"
              style={inputStyle}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          {error && (
            <div style={{ background: "#f8514922", color: "#ffb3b3", border: "1px solid #f8514955", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...buttonStyle, background: "linear-gradient(135deg, #238636, #2ea043)", color: "#fff", border: "none" }}
          >
            <Lock size={15} /> {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [authState, setAuthState] = useState({ checking: true, user: null, error: "" });

  useEffect(() => {
    let alive = true;

    async function checkAuth() {
      try {
        const { data } = await axios.get("/api/auth/me");
        if (!alive) return;
        setAuthState({ checking: false, user: data.user, error: "" });
      } catch (err) {
        if (!alive) return;
        const status = err.response?.status;
        if (status === 401) {
          setAuthState({ checking: false, user: null, error: "" });
        } else {
          setAuthState({
            checking: false,
            user: null,
            error: err.response?.data?.error || err.message || "Unable to verify login state.",
          });
        }
      }
    }

    checkAuth();
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await axios.post("/api/auth/logout");
    } finally {
      setAuthState({ checking: false, user: null, error: "" });
    }
  }

  const headerRight = useMemo(() => {
    if (!authState.user) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
        <div style={{ fontSize: 12, color: "#8b949e" }}>
          Signed in as <span style={{ color: "#f0f6fc", fontWeight: 600 }}>{authState.user.username}</span>
        </div>
        <button onClick={handleLogout} style={{ ...buttonStyle, background: "#21262d", color: "#f0f6fc" }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
    );
  }, [authState.user]);

  if (authState.checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1117", color: "#8b949e", display: "grid", placeItems: "center" }}>
        Checking login...
      </div>
    );
  }

  if (!authState.user) {
    return authState.error ? (
      <div style={{ minHeight: "100vh", background: "#0d1117", color: "#f0f6fc", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ ...cardStyle, maxWidth: 520 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Auth setup issue</div>
          <div style={{ color: "#8b949e", lineHeight: 1.6 }}>{authState.error}</div>
        </div>
      </div>
    ) : (
      <LoginScreen onLogin={(user) => setAuthState({ checking: false, user, error: "" })} />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117" }}>
      <header style={HEADER_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
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
              letterSpacing: "0.04em",
            }}
          >
            HHX
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f6fc" }}>APIM HHX Gateway</div>
            <div style={{ fontSize: 12, color: "#8b949e" }}>Early web UI shell · design-matched from hhx-gateway-apim-main</div>
          </div>
        </div>
        {headerRight}
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
