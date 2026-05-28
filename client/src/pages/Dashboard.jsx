import React, { useState, useEffect, useCallback } from "react";
import { Brain, CalendarSearch, ChartLine, Clock, KeyRound, Radio } from "lucide-react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#58a6ff", "#bc8cff", "#3fb950", "#f78166", "#ffa657", "#79c0ff", "#d2a8ff"];
const card = { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "20px 24px", marginBottom: 20 };
const label = { fontSize: 12, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em" };
const value = { fontSize: 28, fontWeight: 700, color: "#f0f6fc", marginTop: 4 };
const sub = { fontSize: 12, color: "#8b949e", marginTop: 2 };
const WINDOWS = [
  ["5m", "5 min"],
  ["30m", "30 min"],
  ["1h", "1 hr"],
  ["5h", "5 hr"],
  ["8h", "8 hr"],
  ["1d", "1 day"],
  ["1w", "1 week"],
  ["1mo", "1 month"],
];

function StatCard({ label: l, val, sub: s, color = "#f0f6fc" }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 160, overflow: "hidden" }}>
      <div style={label}>{l}</div>
      <div style={{ ...value, color }}>{val ?? "—"}</div>
      {s && <div style={sub}>{s}</div>}
    </div>
  );
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString();
}

function fmtUsd(n, digits = 4) {
  return `$${Number(n || 0).toFixed(digits)}`;
}

function fmtPct(n) {
  return `${(Number(n || 0) * 100).toFixed(1)}%`;
}

export default function Dashboard() {
  const [tab, setTab] = useState("daily");
  const [selectedWindow, setSelectedWindow] = useState("1d");
  const [trendGroup, setTrendGroup] = useState("developer");
  const [daily, setDaily] = useState([]);
  const [windowRows, setWindowRows] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [realtime, setRealtime] = useState([]);
  const [trend, setTrend] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, by_provider: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async (windowKey = selectedWindow) => {
    setLoading(true);
    setError(null);
    try {
      const [d, w, m, rt, tr, bm, lf, sum] = await Promise.all([
        axios.get("/api/usage/daily").then((r) => r.data),
        axios.get(`/api/usage/window?window=${windowKey}`).then((r) => r.data),
        axios.get("/api/usage/monthly").then((r) => r.data),
        axios.get("/api/usage/realtime").then((r) => r.data),
        axios.get(`/api/usage/trend?window=${windowKey}&groupBy=${trendGroup}`).then((r) => r.data),
        axios.get(`/api/usage/by-model?window=${windowKey}`).then((r) => r.data),
        axios.get("/api/usage/live-feed").then((r) => r.data),
        axios.get(`/api/usage/summary?window=${windowKey}`).then((r) => r.data),
      ]);
      setDaily(d || []);
      setWindowRows(w?.rows || []);
      setMonthly(m || []);
      setRealtime(rt || []);
      setTrend(tr || []);
      setByModel(bm || []);
      setLiveFeed(lf || []);
      setSummary(sum || { totals: {}, by_provider: [] });
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedWindow, trendGroup]);

  useEffect(() => {
    fetchAll(selectedWindow);
  }, [fetchAll, selectedWindow, trendGroup]);

  const totalTodayTokens = daily.reduce((a, r) => a + (Number(r.total_tokens) || 0), 0);
  const totalTodayCost = daily.reduce((a, r) => a + (Number(r.est_cost_usd) || 0), 0);
  const totalMonthTokens = monthly.reduce((a, r) => a + (Number(r.total_tokens) || 0), 0);
  const totalMonthCost = monthly.reduce((a, r) => a + (Number(r.est_cost_usd) || 0), 0);
  const uniqueUsers = [...new Set(daily.map((r) => r.developer))].length;
  const realtimeCalls = realtime.reduce((a, r) => a + (Number(r.calls) || 0), 0);
  const summaryTotals = summary?.totals || {};
  const selectedWindowLabel = WINDOWS.find(([k]) => k === selectedWindow)?.[1] || selectedWindow;

  const userWindowTotals = Object.values(
    windowRows.reduce((acc, r) => {
      const dev = r.developer || "unknown";
      if (!acc[dev]) acc[dev] = { developer: dev, total_tokens: 0, est_cost_usd: 0 };
      acc[dev].total_tokens += Number(r.total_tokens) || 0;
      acc[dev].est_cost_usd += Number(r.est_cost_usd) || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.total_tokens - a.total_tokens);

  const subscriptionRows = summary.by_subscription || [];

  // Short-range windows show H:MM, longer windows show MM/DD so the X axis stays readable.
  const trendShowDate = ["1w", "1mo"].includes(selectedWindow);
  const trendRows = trend.reduce((acc, row) => {
    const d = new Date(row.timestamp);
    const time = trendShowDate
      ? d.toLocaleDateString([], { month: "2-digit", day: "2-digit" }) + (selectedWindow === "1w" ? " " + d.toLocaleTimeString([], { hour: "2-digit" }) : "")
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let item = acc.find((x) => x.time === time);
    if (!item) {
      item = { time };
      acc.push(item);
    }
    const seriesKey = trendGroup === "model" ? (row.model || "unknown") : (row.developer || "unknown");
    item[seriesKey] = (item[seriesKey] || 0) + (Number(row.tokens) || 0);
    return acc;
  }, []);
  const trendSeries = [...new Set(trend.map((t) => (trendGroup === "model" ? t.model : t.developer)).filter(Boolean))];

  const tabBtn = (t, l) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        background: tab === t ? "#58a6ff22" : "transparent",
        color: tab === t ? "#58a6ff" : "#8b949e",
        fontWeight: tab === t ? 600 : 400,
        fontSize: 13,
      }}
    >
      {l}
    </button>
  );

  if (error) {
    return <div style={{ ...card, color: "#f85149" }}>Error loading dashboard: {error}</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f6fc" }}>Usage Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: "#161b22", padding: 6, borderRadius: 10, border: "1px solid #30363d" }}>
            {WINDOWS.map(([key, text]) => (
              <button
                key={key}
                onClick={() => setSelectedWindow(key)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: selectedWindow === key ? "#58a6ff22" : "transparent",
                  color: selectedWindow === key ? "#58a6ff" : "#8b949e",
                  fontWeight: selectedWindow === key ? 600 : 400,
                  fontSize: 12,
                }}
              >
                {text}
              </button>
            ))}
          </div>
          {lastRefresh && <span style={{ fontSize: 12, color: "#8b949e" }}>Last refresh: {lastRefresh}</span>}
          <button onClick={() => fetchAll(selectedWindow)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #30363d", background: "#21262d", color: "#f0f6fc", cursor: "pointer", fontSize: 13 }}>
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <StatCard label={`${selectedWindowLabel} Tokens`} val={fmtInt(summaryTotals.total_tokens)} sub={`Aggregate over the selected ${selectedWindowLabel.toLowerCase()} window`} />
        <StatCard label={`${selectedWindowLabel} Cost`} val={fmtUsd(summaryTotals.est_cost_usd)} color="#3fb950" sub="Estimated spend over the selected window" />
        <StatCard label={`${selectedWindowLabel} Calls`} val={fmtInt(summaryTotals.calls)} sub={`${fmtInt(summaryTotals.success_calls)} success · ${fmtInt(summaryTotals.rate_limited_calls)} rate-limited`} />
        <StatCard label="Cache Hit Ratio" val={fmtPct(summaryTotals.cache_hit_ratio)} color="#79c0ff" sub="cached prompt tokens / total prompt tokens" />
        <StatCard label="Today Tokens" val={fmtInt(totalTodayTokens)} sub="UTC day-to-date, all users/models" />
        <StatCard label="Month Cost" val={fmtUsd(totalMonthCost, 2)} color="#ffa657" sub="Estimated spend UTC month-to-date" />
        <StatCard label="Today Active Users" val={uniqueUsers} sub="Distinct users with calls today" />
        <StatCard label="Active API Keys" val={fmtInt(summaryTotals.active_subscriptions)} color="#bc8cff" sub="Distinct APIM subscriptions in window" />
        <StatCard label="Real-time (5 min)" val={realtimeCalls} color="#58a6ff" sub="Calls in the last 5 minutes" />
      </div>

      <div style={{ ...card, paddingTop: 16 }}>
        <div style={{ ...label, marginBottom: 12 }}>Selected Window Summary by Provider</div>
        {summary.by_provider?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #30363d" }}>
                  {["Provider", "Calls", "Tokens", "Fresh In", "Cached", "Cache Create", "Cost", "Cache Hit"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8b949e", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.by_provider.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                    <td style={{ padding: "8px 12px", color: "#f0f6fc", textTransform: "capitalize" }}>{r.provider || "unknown"}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.calls)}</td>
                    <td style={{ padding: "8px 12px", color: "#f0f6fc", fontWeight: 600 }}>{fmtInt(r.total_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.fresh_prompt_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#79c0ff" }}>{fmtInt(r.cached_prompt_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#ffa657" }}>{fmtInt(r.cache_creation_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#3fb950", fontWeight: 600 }}>{fmtUsd(r.est_cost_usd)}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtPct(r.cache_hit_ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#8b949e", fontSize: 13 }}>No summary data for this window yet.</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#161b22", padding: 6, borderRadius: 10, width: "fit-content" }}>
        {tabBtn("daily", <><CalendarSearch size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Today by User/Model</>)}
        {tabBtn("keys", <><KeyRound size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />By API Key</>)}
        {tabBtn("model", <><Brain size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />By Model</>)}
        {tabBtn("trend", <><ChartLine size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Trend</>)}
        {tabBtn("realtime", <><Clock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Real-time</>)}
        {tabBtn("feed", <><Radio size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Live Feed</>)}
      </div>

      {tab === "daily" && (
        <>
          <div style={card}>
            <div style={{ ...label, marginBottom: 16 }}>Selected Window Token Usage by User</div>
            {userWindowTotals.length === 0 ? (
              <div style={{ color: "#8b949e", fontSize: 13 }}>No usage data yet. Connect metrics to populate this chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={userWindowTotals} margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="developer" tick={{ fill: "#8b949e", fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8 }} labelStyle={{ color: "#f0f6fc" }} />
                  <Bar dataKey="total_tokens" fill="#58a6ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={card}>
            <div style={{ ...label, marginBottom: 16 }}>Selected Window — Usage by User / API Key / Model</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #30363d" }}>
                    {["User", "API Key", "Provider", "Model", "Calls", "Input", "Fresh In", "Cached", "Cache Create", "Output", "Total", "Cache Hit", "Est. Cost"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8b949e", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {windowRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: "24px 12px", color: "#8b949e", textAlign: "center" }}>
                        No usage data yet. This table will populate once the API is connected.
                      </td>
                    </tr>
                  ) : (
                    windowRows
                      .filter((r) => Number(r.input_tokens) > 0)
                      .map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: "8px 12px", color: "#f0f6fc" }}>{r.developer}</td>
                        <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.subscription_name || "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e", textTransform: "capitalize" }}>{r.provider}</td>
                        <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.model}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.calls)}</td>
                        <td style={{ padding: "8px 12px", color: "#f85149" }}>{r.error_rate != null ? fmtPct(r.error_rate) : "—"}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.input_tokens)}</td>
                        <td style={{ padding: "8px 12px", color: "#58a6ff", fontWeight: 600 }}>{fmtInt(r.fresh_prompt_tokens)}</td>
                        <td style={{ padding: "8px 12px", color: "#79c0ff" }}>{fmtInt(r.cached_prompt_tokens)}</td>
                        <td style={{ padding: "8px 12px", color: "#ffa657" }}>{fmtInt(r.cache_creation_tokens)}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.output_tokens)}</td>
                        <td style={{ padding: "8px 12px", color: "#f0f6fc", fontWeight: 600 }}>{fmtInt(r.total_tokens)}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtPct(r.cache_hit_ratio)}</td>
                        <td style={{ padding: "8px 12px", color: "#3fb950", fontWeight: 600 }}>{fmtUsd(r.est_cost_usd)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "keys" && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 16 }}>Selected Window — Usage by API Key (APIM Subscription)</div>
          <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 12 }}>
            APIM subscription = the key handed out. Owner is the APIM developer the key belongs to.
            One owner can have many keys; this breakdown is per individual key.
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #30363d" }}>
                  {["API Key", "Owner", "Providers", "Models", "Calls", "Fresh In", "Cached", "Output", "Total", "Cache Hit", "Est. Cost"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8b949e", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptionRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "24px 12px", color: "#8b949e", textAlign: "center" }}>
                      No per-key usage yet in this window.
                    </td>
                  </tr>
                ) : (
                  subscriptionRows.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                      <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace", fontWeight: 600 }}>{s.subscription_name}</td>
                      <td style={{ padding: "8px 12px", color: "#f0f6fc" }}>{s.owner || "unknown"}</td>
                      <td style={{ padding: "8px 12px", color: "#8b949e", textTransform: "capitalize" }}>{(s.providers || []).join(", ")}</td>
                      <td style={{ padding: "8px 12px", color: "#8b949e", fontFamily: "monospace", fontSize: 12 }}>{(s.models || []).join(", ") || "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(s.calls)}</td>
                      <td style={{ padding: "8px 12px", color: "#58a6ff", fontWeight: 600 }}>{fmtInt(s.fresh_prompt_tokens)}</td>
                      <td style={{ padding: "8px 12px", color: "#79c0ff" }}>{fmtInt(s.cached_prompt_tokens)}</td>
                      <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(s.output_tokens)}</td>
                      <td style={{ padding: "8px 12px", color: "#f0f6fc", fontWeight: 600 }}>{fmtInt(s.total_tokens)}</td>
                      <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtPct(s.cache_hit_ratio)}</td>
                      <td style={{ padding: "8px 12px", color: "#3fb950", fontWeight: 600 }}>{fmtUsd(s.est_cost_usd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "model" && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 16 }}>Usage by Model — {selectedWindowLabel}</div>
          {byModel.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 13 }}>No model usage data in this window yet.</div>
          ) : (
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
              <PieChart width={320} height={280}>
                <Pie data={byModel} dataKey="total_tokens" nameKey="model" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                  {byModel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => Number(v).toLocaleString()}
                  contentStyle={{ background: "#161b22", border: "1px solid #30363d", color: "#f0f6fc" }}
                  itemStyle={{ color: "#f0f6fc" }}
                  labelStyle={{ color: "#f0f6fc" }}
                />
              </PieChart>
              <div style={{ flex: 1, minWidth: 320, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #30363d" }}>
                      {["Model", "Tokens", "Share"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8b949e", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sum = byModel.reduce((a, r) => a + (Number(r.total_tokens) || 0), 0) || 1;
                      return byModel.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                          <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.model || "unknown"}</td>
                          <td style={{ padding: "8px 12px", color: "#f0f6fc", fontWeight: 600 }}>{fmtInt(r.total_tokens)}</td>
                          <td style={{ padding: "8px 12px", color: "#8b949e" }}>{((Number(r.total_tokens) || 0) * 100 / sum).toFixed(1)}%</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "trend" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={label}>Token Burn Rate — {selectedWindowLabel}</div>
            <div style={{ display: "flex", gap: 4, background: "#0d1117", padding: 4, borderRadius: 8 }}>
              {[["developer", "By User"], ["model", "By Model"]].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTrendGroup(k)}
                  style={{
                    padding: "5px 12px",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    background: trendGroup === k ? "#21262d" : "transparent",
                    color: trendGroup === k ? "#f0f6fc" : "#8b949e",
                    fontWeight: trendGroup === k ? 600 : 400,
                  }}
                >{l}</button>
              ))}
            </div>
          </div>
          {trendRows.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 13 }}>No trend data for this window yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="time" tick={{ fill: "#8b949e", fontSize: 11 }} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {trendSeries.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === "realtime" && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 16 }}>Real-time Usage — Last 5 Minutes</div>
          {realtime.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 13 }}>No real-time activity yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #30363d" }}>
                  {["User", "API Key", "Provider", "Model", "Calls", "Input", "Fresh In", "Cached", "Output"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", color: "#8b949e", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {realtime.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                    <td style={{ padding: "8px 12px", color: "#f0f6fc" }}>{r.developer}</td>
                    <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.subscription_name || "—"}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e", textTransform: "capitalize" }}>{r.provider}</td>
                    <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.model}</td>
                    <td style={{ padding: "8px 12px", color: "#58a6ff", fontWeight: 600 }}>{fmtInt(r.calls)}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.input_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#58a6ff", fontWeight: 600 }}>{fmtInt(r.fresh_prompt_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#79c0ff" }}>{fmtInt(r.cached_prompt_tokens)}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{fmtInt(r.output_tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "feed" && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 16 }}>Live Request Feed — Last 60 Minutes</div>
          {liveFeed.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 13 }}>No recent requests yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "monospace" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #30363d" }}>
                    {["Time", "User", "API Key", "Provider", "Model", "Status", "In", "Fresh In", "Cached", "Out", "Total"].map((h) => (
                      <th key={h} style={{ padding: "6px 12px", color: "#8b949e", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveFeed.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1c2128" }}>
                      <td style={{ padding: "5px 12px", color: "#8b949e" }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: "5px 12px", color: "#f0f6fc" }}>{r.developer}</td>
                      <td style={{ padding: "5px 12px", color: "#bc8cff" }}>{r.subscription_name || "—"}</td>
                      <td style={{ padding: "5px 12px", color: "#8b949e", textTransform: "capitalize" }}>{r.provider}</td>
                      <td style={{ padding: "5px 12px", color: "#bc8cff" }}>{r.model}</td>
                      <td style={{ padding: "5px 12px", color: Number(r.statusCode) === 429 ? "#ffa657" : "#8b949e" }}>{r.statusCode}</td>
                      <td style={{ padding: "5px 12px", color: "#8b949e" }}>{fmtInt(r.prompt_tokens)}</td>
                      <td style={{ padding: "5px 12px", color: "#58a6ff", fontWeight: 600 }}>{fmtInt(r.fresh_prompt_tokens)}</td>
                      <td style={{ padding: "5px 12px", color: "#79c0ff" }}>{fmtInt(r.cached_prompt_tokens)}</td>
                      <td style={{ padding: "5px 12px", color: "#8b949e" }}>{fmtInt(r.output_tokens)}</td>
                      <td style={{ padding: "5px 12px", color: "#58a6ff", fontWeight: 600 }}>{fmtInt(r.total_tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
