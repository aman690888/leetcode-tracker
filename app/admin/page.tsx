"use client";

/**
 * app/admin/page.tsx
 *
 * Protected admin dashboard for viewing persistent usage logs.
 * Requires ADMIN_SECRET (via ?key=... query param or on-screen prompt).
 * Not linked in public navigation.
 */

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UsageLogRow } from "@/lib/usage-logger";

function AdminDashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlKey = searchParams.get("key") || "";
  const [adminKey, setAdminKey] = useState(urlKey);
  const [inputKey, setInputKey] = useState("");
  const [logs, setLogs] = useState<UsageLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchLogs = async (keyToUse: string) => {
    if (!keyToUse.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/logs?key=${encodeURIComponent(keyToUse.trim())}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed.");
        setIsAuthenticated(false);
      } else {
        setLogs(data.logs || []);
        setIsAuthenticated(true);
        setAdminKey(keyToUse.trim());

        // Update URL with key if not present
        if (searchParams.get("key") !== keyToUse.trim()) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("key", keyToUse.trim());
          router.replace(`?${params.toString()}`, { scroll: false });
        }
      }
    } catch {
      setError("Network error: Failed to fetch usage logs.");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlKey) {
      fetchLogs(urlKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      fetchLogs(inputKey.trim());
    }
  };

  // Filter logs by username
  const filteredLogs = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter((log) => log.username.toLowerCase().includes(q));
  }, [logs, searchFilter]);

  // Summary statistics
  const totalRequests = logs.length;
  const uniqueUsers = useMemo(() => {
    const set = new Set(logs.map((l) => l.username.toLowerCase().trim()).filter(Boolean));
    return set.size;
  }, [logs]);

  return (
    <div className="admin-container">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <span className="admin-badge">ADMIN</span>
          <span className="admin-title">Usage &amp; Telemetry Logs</span>
        </div>
        {isAuthenticated && (
          <div className="admin-header-right">
            <button
              onClick={() => fetchLogs(adminKey)}
              disabled={loading}
              className="refresh-btn"
            >
              {loading ? "Refreshing..." : "↺ Refresh"}
            </button>
          </div>
        )}
      </header>

      <main className="admin-body">
        {/* State 1: Password / Key Prompt */}
        {!isAuthenticated ? (
          <div className="auth-card">
            <div className="auth-card-icon">🔒</div>
            <h2 className="auth-card-title">Admin Access Required</h2>
            <p className="auth-card-desc">
              Enter your <code>ADMIN_SECRET</code> key to access persistent usage logs.
            </p>

            <form onSubmit={handleKeySubmit} className="auth-form">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Enter ADMIN_SECRET..."
                className="auth-input"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !inputKey.trim()}
                className="auth-submit-btn"
              >
                {loading ? "Verifying..." : "Unlock Dashboard →"}
              </button>
            </form>

            {error && <div className="auth-error-msg">{error}</div>}
          </div>
        ) : (
          /* State 2: Authenticated Dashboard */
          <div className="dashboard-content">
            {/* Stats Summary Row */}
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-label">TOTAL REQUESTS</span>
                <span className="stat-number text-blue">{totalRequests}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">UNIQUE STUDENTS</span>
                <span className="stat-number text-green">{uniqueUsers}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">FILTERED MATCHES</span>
                <span className="stat-number text-amber">{filteredLogs.length}</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="table-controls">
              <div className="search-group">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by username..."
                  className="search-input"
                />
                {searchFilter && (
                  <button onClick={() => setSearchFilter("")} className="clear-search">
                    ×
                  </button>
                )}
              </div>
              <span className="log-count-text">
                Showing {filteredLogs.length} of {totalRequests} logs (most recent first)
              </span>
            </div>

            {/* Logs Table */}
            <div className="table-wrapper">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp (IST)</th>
                    <th>Username</th>
                    <th>Action</th>
                    <th>Result</th>
                    <th>IP Address</th>
                    <th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-td">
                        {totalRequests === 0
                          ? "No usage logs recorded yet in Google Sheets."
                          : "No logs found matching filter."}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((row, i) => (
                      <tr key={`${row.timestamp}-${row.username}-${i}`}>
                        <td className="time-td">{row.timestamp}</td>
                        <td className="user-td">
                          <span className="user-pill">{row.username || "—"}</span>
                        </td>
                        <td className="action-td">
                          <span className="action-tag">{row.action || "fetch"}</span>
                        </td>
                        <td className="result-td">
                          <span className="result-badge">{row.result || "—"}</span>
                        </td>
                        <td className="ip-td">{row.ip || "—"}</td>
                        <td className="ua-td" title={row.userAgent}>
                          {row.userAgent || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .admin-container {
          min-height: 100vh;
          background: #0d1117;
          color: #e6edf3;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          background: #161b22;
          border-bottom: 1px solid #30363d;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-badge {
          background: #f85149;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          font-family: ui-monospace, "Cascadia Code", monospace;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .admin-title {
          font-size: 14px;
          font-weight: 600;
          color: #e6edf3;
        }

        .refresh-btn {
          background: #21262d;
          border: 1px solid #30363d;
          color: #58a6ff;
          font-family: ui-monospace, "Cascadia Code", monospace;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #30363d;
          color: #79c0ff;
        }

        .admin-body {
          flex: 1;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }

        /* Auth Prompt Card */
        .auth-card {
          max-width: 420px;
          margin: 60px auto 0;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 28px;
          text-align: center;
        }

        .auth-card-icon {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .auth-card-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px;
          color: #e6edf3;
        }

        .auth-card-desc {
          font-size: 13px;
          color: #8b949e;
          line-height: 1.5;
          margin: 0 0 20px;
        }

        .auth-card-desc code {
          color: #58a6ff;
          font-family: ui-monospace, "Cascadia Code", monospace;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .auth-input {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 10px 14px;
          color: #e6edf3;
          font-family: ui-monospace, "Cascadia Code", monospace;
          font-size: 13px;
          outline: none;
        }

        .auth-input:focus {
          border-color: #58a6ff;
        }

        .auth-submit-btn {
          background: #3fb950;
          color: #0d1117;
          border: none;
          border-radius: 6px;
          padding: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .auth-submit-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .auth-error-msg {
          margin-top: 14px;
          color: #f85149;
          font-size: 12px;
          font-family: ui-monospace, "Cascadia Code", monospace;
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-box {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-family: ui-monospace, "Cascadia Code", monospace;
          font-size: 11px;
          color: #8b949e;
          letter-spacing: 0.05em;
        }

        .stat-number {
          font-size: 28px;
          font-weight: 700;
          font-family: ui-monospace, "Cascadia Code", monospace;
        }

        .text-blue { color: #58a6ff; }
        .text-green { color: #3fb950; }
        .text-amber { color: #d29922; }

        /* Table Controls */
        .table-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-group {
          display: flex;
          align-items: center;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 4px 10px;
          min-width: 260px;
        }

        .search-icon {
          font-size: 12px;
          opacity: 0.6;
          margin-right: 6px;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e6edf3;
          font-size: 13px;
          font-family: system-ui, sans-serif;
        }

        .clear-search {
          background: none;
          border: none;
          color: #8b949e;
          font-size: 16px;
          cursor: pointer;
        }

        .log-count-text {
          font-size: 12px;
          color: #8b949e;
          font-family: ui-monospace, "Cascadia Code", monospace;
        }

        /* Table */
        .table-wrapper {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          overflow-x: auto;
        }

        .logs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          text-align: left;
        }

        .logs-table th {
          background: #21262d;
          color: #8b949e;
          font-family: ui-monospace, "Cascadia Code", monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 10px 14px;
          border-bottom: 1px solid #30363d;
          letter-spacing: 0.03em;
        }

        .logs-table td {
          padding: 10px 14px;
          border-bottom: 1px solid #21262d;
          color: #e6edf3;
        }

        .logs-table tr:last-child td {
          border-bottom: none;
        }

        .logs-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .time-td {
          font-family: ui-monospace, "Cascadia Code", monospace;
          color: #8b949e;
          white-space: nowrap;
        }

        .user-pill {
          background: rgba(88, 166, 255, 0.12);
          color: #58a6ff;
          font-family: ui-monospace, "Cascadia Code", monospace;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .action-tag {
          font-family: ui-monospace, "Cascadia Code", monospace;
          color: #7ee787;
          font-size: 11px;
        }

        .result-badge {
          background: rgba(63, 185, 80, 0.15);
          color: #3fb950;
          font-family: ui-monospace, "Cascadia Code", monospace;
          font-weight: 700;
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .ip-td {
          font-family: ui-monospace, "Cascadia Code", monospace;
          color: #8b949e;
        }

        .ua-td {
          color: #6e7681;
          font-family: ui-monospace, "Cascadia Code", monospace;
          font-size: 11px;
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-td {
          text-align: center;
          padding: 40px !important;
          color: #8b949e;
          font-family: ui-monospace, "Cascadia Code", monospace;
        }
      `}</style>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminDashboardInner />
    </Suspense>
  );
}
