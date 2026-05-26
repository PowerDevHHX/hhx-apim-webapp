import React, { useState, useEffect, useCallback } from "react";
import { Brain, CalendarSearch, ChartLine, Clock, Radio } from "lucide-react";
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

function StatCard({ label: l, val, sub: s, color = "#f0f6fc" }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 160 }}>
      <div style={label}>{l}</div>
      <div style={{ ...value, color }}>{val ?? "—"}</div>
      {s && <div style={sub}>{s}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState("daily");
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [realtime, setRealtime] = useState([]);
  const [trend, setTrend] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, m, rt, tr, bm, lf] = await Promise.all([
        axios.get("/api/usage/daily").then((r) => r.data),
        axios.get("/api/usage/monthly").then((r) => r.data),
        axios.get("/api/usage/realtime").then((r) => r.data),
        axios.get("/api/usage/trend").then((r) => r.data),
        axios.get("/api/usage/by-model").then((r) => r.data),
        axios.get("/api/usage/live-feed").then((r) => r.data),
      ]);
      setDaily(d || []);
      setMonthly(m || []);
      setRealtime(rt || []);
      setTrend(tr || []);
      setByModel(bm || []);
      setLiveFeed(lf || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalTodayTokens = daily.reduce((a, r) => a + (Number(r.total_tokens) || 0), 0);
  const totalTodayCost = daily.reduce((a, r) => a + (Number(r.est_cost_usd) || 0), 0);
  const totalMonthTokens = monthly.reduce((a, r) => a + (Number(r.total_tokens) || 0), 0);
  const totalMonthCost = monthly.reduce((a, r) => a + (Number(r.est_cost_usd) || 0), 0);
  const uniqueUsers = [...new Set(daily.map((r) => r.developer))].length;
  const realtimeCalls = realtime.reduce((a, r) => a + (Number(r.calls) || 0), 0);

  const userDailyTotals = Object.values(
    daily.reduce((acc, r) => {
      const dev = r.developer || "unknown";
      if (!acc[dev]) acc[dev] = { developer: dev, total_tokens: 0 };
      acc[dev].total_tokens += Number(r.total_tokens) || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.total_tokens - a.total_tokens);

  const trendRows = trend.reduce((acc, row) => {
    const key = new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let item = acc.find((x) => x.time === key);
    if (!item) {
      item = { time: key };
      acc.push(item);
    }
    item[row.developer] = row.tokens;
    return acc;
  }, []);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f6fc" }}>Usage Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && <span style={{ fontSize: 12, color: "#8b949e" }}>Last refresh: {lastRefresh}</span>}
          <button onClick={fetchAll} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #30363d", background: "#21262d", color: "#f0f6fc", cursor: "pointer", fontSize: 13 }}>
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <StatCard label="Today's Tokens" val={totalTodayTokens.toLocaleString()} sub="All users combined" />
        <StatCard label="Today's Cost" val={`$${totalTodayCost.toFixed(4)}`} color="#3fb950" sub="Waiting for real data" />
        <StatCard label="Monthly Tokens" val={totalMonthTokens.toLocaleString()} sub="This calendar month" />
        <StatCard label="Monthly Cost" val={`$${totalMonthCost.toFixed(2)}`} color="#ffa657" sub="Waiting for real data" />
        <StatCard label="Active Users" val={uniqueUsers} sub="With usage today" />
        <StatCard label="Real-time (5min)" val={realtimeCalls} color="#58a6ff" sub="Calls in last 5 min" />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#161b22", padding: 6, borderRadius: 10, width: "fit-content" }}>
        {tabBtn("daily", <><CalendarSearch size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Today by User/Model</>)}
        {tabBtn("model", <><Brain size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />By Model</>)}
        {tabBtn("trend", <><ChartLine size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />24h Trend</>)}
        {tabBtn("realtime", <><Clock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Real-time</>)}
        {tabBtn("feed", <><Radio size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Live Feed</>)}
      </div>

      {tab === "daily" && (
        <>
          <div style={card}>
            <div style={{ ...label, marginBottom: 16 }}>Today's Token Usage by User</div>
            {userDailyTotals.length === 0 ? (
              <div style={{ color: "#8b949e", fontSize: 13 }}>No usage data yet. Connect metrics to populate this chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={userDailyTotals} margin={{ left: 16 }}>
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
            <div style={{ ...label, marginBottom: 16 }}>Today — Usage by User / Model</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #30363d" }}>
                    {["User", "Model", "Calls", "Input Tokens", "Output Tokens", "Total Tokens", "Est. Cost"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#8b949e", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daily.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "24px 12px", color: "#8b949e", textAlign: "center" }}>
                        No usage data yet. This table will populate once the API is connected.
                      </td>
                    </tr>
                  ) : (
                    daily.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: "8px 12px", color: "#f0f6fc" }}>{r.developer}</td>
                        <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.model}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{Number(r.calls).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{Number(r.input_tokens).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", color: "#8b949e" }}>{Number(r.output_tokens).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", color: "#f0f6fc", fontWeight: 600 }}>{Number(r.total_tokens).toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", color: "#3fb950", fontWeight: 600 }}>${Number(r.est_cost_usd).toFixed(4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "model" && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 16 }}>Today's Usage by Model</div>
          {byModel.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 13 }}>No model usage data yet.</div>
          ) : (
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center" }}>
              <PieChart width={300} height={260}>
                <Pie data={byModel} dataKey="total_tokens" nameKey="model" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                  {byModel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
              </PieChart>
            </div>
          )}
        </div>
      )}

      {tab === "trend" && (
        <div style={card}>
          <div style={{ ...label, marginBottom: 16 }}>Token Burn Rate — Last 24 Hours</div>
          {trendRows.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 13 }}>No trend data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="time" tick={{ fill: "#8b949e", fontSize: 11 }} />
                <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {[...new Set(trend.map((t) => t.developer))].map((dev, i) => (
                  <Line key={dev} type="monotone" dataKey={dev} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
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
                  {["User", "Model", "Calls", "Input Tokens", "Output Tokens"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", color: "#8b949e", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {realtime.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                    <td style={{ padding: "8px 12px", color: "#f0f6fc" }}>{r.developer}</td>
                    <td style={{ padding: "8px 12px", color: "#bc8cff", fontFamily: "monospace" }}>{r.model}</td>
                    <td style={{ padding: "8px 12px", color: "#58a6ff", fontWeight: 600 }}>{Number(r.calls).toLocaleString()}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{Number(r.input_tokens).toLocaleString()}</td>
                    <td style={{ padding: "8px 12px", color: "#8b949e" }}>{Number(r.output_tokens).toLocaleString()}</td>
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
                    {["Time", "User", "Model", "In Tokens", "Out Tokens", "Total"].map((h) => (
                      <th key={h} style={{ padding: "6px 12px", color: "#8b949e", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveFeed.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1c2128" }}>
                      <td style={{ padding: "5px 12px", color: "#8b949e" }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: "5px 12px", color: "#f0f6fc" }}>{r.developer}</td>
                      <td style={{ padding: "5px 12px", color: "#bc8cff" }}>{r.model}</td>
                      <td style={{ padding: "5px 12px", color: "#8b949e" }}>{(r.prompt_tokens ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "5px 12px", color: "#8b949e" }}>{(r.output_tokens ?? 0).toLocaleString()}</td>
                      <td style={{ padding: "5px 12px", color: "#58a6ff", fontWeight: 600 }}>{(r.total_tokens ?? 0).toLocaleString()}</td>
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
