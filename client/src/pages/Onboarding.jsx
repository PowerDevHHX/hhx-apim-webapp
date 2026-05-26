import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrainCircuit, Copy, FlaskConical, KeyRound, Trash2, Users } from "lucide-react";

const card = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: 12,
  padding: "20px 24px",
  marginBottom: 20,
};

const label = { fontSize: 12, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em" };

const input = {
  width: "100%",
  padding: "10px 14px",
  background: "#0d1117",
  border: "1px solid #30363d",
  borderRadius: 8,
  color: "#f0f6fc",
  fontSize: 14,
  outline: "none",
};

const btn = (variant = "primary", compact = false) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: compact ? "5px 12px" : "10px 20px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: compact ? 12 : 14,
  ...(variant === "primary"
    ? { background: "linear-gradient(135deg, #238636, #2ea043)", color: "#fff" }
    : variant === "danger"
    ? { background: "linear-gradient(135deg, #b91c1c, #dc2626)", color: "#fff" }
    : { background: "#21262d", color: "#f0f6fc", border: "1px solid #30363d" }),
});

const GROUP_COLORS = {
  HUMAN: { bg: "#1f3a5f", color: "#58a6ff", border: "#2f4f7f" },
  AGENT: { bg: "#1f3a2a", color: "#3fb950", border: "#2a5a35" },
  LAB: { bg: "#3a2a1f", color: "#ffa657", border: "#6a4020" },
};

function userGroup(name = "") {
  if (name.includes("AGENT")) return "AGENT";
  if (name.includes("LAB")) return "LAB";
  return "HUMAN";
}

function GroupBadge({ group }) {
  const c = GROUP_COLORS[group] || GROUP_COLORS.HUMAN;
  const icon = group === "AGENT" ? <BrainCircuit size={11} /> : group === "LAB" ? <FlaskConical size={11} /> : <Users size={11} />;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>
      {icon}
      {group}
    </span>
  );
}

function KeyReveal({ subId }) {
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    setLoading(true);
    try {
      const r = await axios.get(`/api/keys/${subId}/key`);
      setKey(r.data.apiKey);
    } catch (e) {
      setKey("Error: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!key) {
    return <button onClick={reveal} disabled={loading} style={btn("secondary", true)}><KeyRound size={12} /> {loading ? "..." : "Show Key"}</button>;
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <code style={{ background: "#0d1117", padding: "4px 8px", borderRadius: 6, fontSize: 11, color: "#58a6ff", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{key}</code>
      <button onClick={copy} style={btn("secondary", true)}><Copy size={12} /> {copied ? "Copied!" : "Copy"}</button>
    </div>
  );
}

function HowToUse() {
  const [activeTab, setActiveTab] = React.useState("Node.js / JS");
  const snippets = {
    "Node.js / JS": `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: "YOUR_API_KEY_HERE",\n  baseURL: "https://hhx-ai-gateway.azure-api.net/hhx-ai-models/openai/v1",\n  defaultHeaders: { "api-key": "YOUR_API_KEY_HERE" },\n});`,
    "Python": `from openai import AzureOpenAI\n\nclient = AzureOpenAI(\n    api_key="YOUR_API_KEY_HERE",\n    azure_endpoint="https://hhx-ai-gateway.azure-api.net/hhx-ai-models/openai/v1",\n    api_version="2024-02-15-preview",\n)`,
    "OpenClaw": `{\n  "models": {\n    "providers": {\n      "hhx-gateway": {\n        "baseUrl": "https://hhx-ai-gateway.azure-api.net/hhx-ai-models/openai/v1",\n        "apiKey": "YOUR_API_KEY_HERE"\n      }\n    }\n  }\n}`,
  };

  return (
    <div style={card}>
      <div style={{ ...label, marginBottom: 12 }}>How to Use Your API Key</div>
      <div style={{ display: "flex", gap: 2, background: "#0d1117", padding: 4, borderRadius: 8, width: "fit-content" }}>
        {Object.keys(snippets).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "5px 14px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, background: activeTab === t ? "#21262d" : "transparent", color: activeTab === t ? "#f0f6fc" : "#8b949e", fontWeight: activeTab === t ? 600 : 400 }}>{t}</button>
        ))}
      </div>
      <pre style={{ marginTop: 0, background: "#0d1117", border: "1px solid #30363d", borderRadius: "0 8px 8px 8px", padding: 16, fontSize: 12, color: "#e6edf3", overflowX: "auto", lineHeight: 1.6 }}>{snippets[activeTab]}</pre>
    </div>
  );
}

export default function Onboarding() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState({ id: "", displayName: "", group: "HUMAN" });
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [formError, setFormError] = useState(null);

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      const r = await axios.get("/api/keys");
      setKeys(r.data.filter(k => k.id?.startsWith("hhx-")));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadKeys(); }, []);

  async function createKey(e) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    setNewKey(null);
    try {
      const r = await axios.post("/api/keys", form);
      setNewKey(r.data);
      setForm({ id: "", displayName: "", group: "HUMAN" });
      loadKeys();
    } catch (e) {
      setFormError(e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id) {
    if (!window.confirm(`Delete key "${id}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/keys/${id}`);
      loadKeys();
    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }
  }

  const filtered = keys.filter(k => {
    const dn = k.displayName || "";
    const g = userGroup(dn);
    return (filter === "ALL" || g === filter) && (dn.toLowerCase().includes(search.toLowerCase()) || k.id.includes(search.toLowerCase()));
  });

  const counts = {
    ALL: keys.length,
    HUMAN: keys.filter(k => userGroup(k.displayName) === "HUMAN").length,
    AGENT: keys.filter(k => userGroup(k.displayName) === "AGENT").length,
    LAB: keys.filter(k => userGroup(k.displayName) === "LAB").length,
  };

  const filterBtn = (f, l) => (
    <button onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, background: filter === f ? "#58a6ff22" : "transparent", color: filter === f ? "#58a6ff" : "#8b949e", fontWeight: filter === f ? 600 : 400 }}>
      {l} <span style={{ fontSize: 11, opacity: 0.7 }}>({counts[f]})</span>
    </button>
  );

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f6fc", marginBottom: 20 }}>API Key Management</h2>

      <div style={card}>
        <div style={{ ...label, marginBottom: 16 }}>Create New API Key</div>
        <form onSubmit={createKey}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px auto", gap: 12, alignItems: "end" }}>
            <div>
              <div style={{ ...label, marginBottom: 6 }}>Subscription ID</div>
              <input style={input} placeholder="" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} required />
            </div>
            <div>
              <div style={{ ...label, marginBottom: 6 }}>Display Name</div>
              <input style={input} placeholder="" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required />
            </div>
            <div>
              <div style={{ ...label, marginBottom: 6 }}>Key Type</div>
              <select style={input} value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                <option value="HUMAN">Human User</option>
                <option value="AGENT">Agent (automated)</option>
                <option value="LAB">Lab / Research</option>
              </select>
            </div>
            <button type="submit" disabled={creating} style={{ ...btn("primary"), alignSelf: "end", whiteSpace: "nowrap" }}>
              <KeyRound size={15} /> {creating ? "Creating..." : "Create Key"}
            </button>
          </div>
        </form>

        {formError && <div style={{ marginTop: 12, padding: "10px 14px", background: "#b91c1c22", borderRadius: 8, color: "#f85149", fontSize: 13 }}>{formError}</div>}

        {newKey && (
          <div style={{ marginTop: 12, padding: "14px 18px", background: "#1a3a1f", borderRadius: 8, border: "1px solid #3fb950" }}>
            <div style={{ color: "#3fb950", fontWeight: 600, marginBottom: 8 }}>Key Created!</div>
            <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: "#8b949e" }}>Display Name: </span><span style={{ color: "#f0f6fc" }}>{newKey.displayName}</span></div>
            <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: "#8b949e" }}>Subscription ID: </span><code style={{ color: "#58a6ff" }}>{newKey.id}</code></div>
            <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: "#8b949e" }}>API Key: </span><code style={{ color: "#ffa657", wordBreak: "break-all" }}>{newKey.apiKey}</code></div>
            <div style={{ fontSize: 13 }}><span style={{ color: "#8b949e" }}>Endpoint: </span><code style={{ color: "#bc8cff" }}>{newKey.endpoint}</code></div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={label}>Existing API Keys ({keys.length})</div>
          <div style={{ display: "flex", gap: 8 }}><button onClick={loadKeys} style={btn("secondary")}>↻ Refresh</button></div>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#0d1117", padding: 6, borderRadius: 10, width: "fit-content" }}>
          {filterBtn("ALL", "All")}
          {filterBtn("HUMAN", <><Users size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Humans</>)}
          {filterBtn("AGENT", <><BrainCircuit size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Agents</>)}
          {filterBtn("LAB", <><FlaskConical size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Labs</>)}
        </div>

        <input style={{ ...input, marginBottom: 16, maxWidth: 360 }} placeholder="Search by name or subscription ID..." value={search} onChange={e => setSearch(e.target.value)} />

        {error && <div style={{ color: "#f85149", marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}

        {loading ? <div style={{ color: "#8b949e", fontSize: 13 }}>Loading keys...</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #30363d" }}>
                  {["Subscription ID","Display Name","Type","State","API Key","Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", color: "#8b949e", textAlign: "left", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => {
                  const g = userGroup(k.displayName);
                  return (
                    <tr key={k.id} style={{ borderBottom: "1px solid #1c2128" }}>
                      <td style={{ padding: "8px 12px" }}><code style={{ color: "#8b949e", fontSize: 12 }}>{k.id}</code></td>
                      <td style={{ padding: "8px 12px", color: "#f0f6fc" }}>{k.displayName}</td>
                      <td style={{ padding: "8px 12px" }}><GroupBadge group={g} /></td>
                      <td style={{ padding: "8px 12px" }}><span style={{ color: k.state === "active" ? "#3fb950" : "#f85149", fontSize: 12 }}>{k.state === "active" ? "● Active" : `● ${k.state}`}</span></td>
                      <td style={{ padding: "8px 12px" }}><KeyReveal subId={k.id} /></td>
                      <td style={{ padding: "8px 12px" }}><button onClick={() => deleteKey(k.id)} style={btn("danger", true)}><Trash2 size={12} /> Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HowToUse />
    </div>
  );
}
