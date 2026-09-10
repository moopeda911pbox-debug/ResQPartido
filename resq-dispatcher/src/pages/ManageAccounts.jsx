import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users, UserCog, Shield, UserPlus, Eye } from "lucide-react";
import StatCard from "../components/StatCard";
import CreateAccountModal from "../components/CreateAccountModal";
import AccountDetailModal from "../components/AccountDetailModal";
import { fetchAllAccounts, archiveAccount, restoreAccount } from "../lib/adminAccounts";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "staff", label: "Dispatcher & Admin Accounts" },
  { key: "citizens", label: "Citizen Accounts" },
];

function displayName(p) {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—";
}

export default function ManageAccounts() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("staff");
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await fetchAllAccounts();
      setStaff(result.staff);
      setCitizens(result.citizens);
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: staff.length + citizens.length,
      dispatchers: staff.filter((s) => s.role === "dispatcher").length,
      admins: staff.filter((s) => s.role === "admin").length,
      citizens: citizens.length,
    }),
    [staff, citizens]
  );

  const visibleStaff = useMemo(() => staff.filter((p) => showArchived || !p.is_archived), [staff, showArchived]);
  const visibleCitizens = useMemo(() => citizens.filter((p) => showArchived || !p.is_archived), [citizens, showArchived]);
  const archivedCount = useMemo(
    () => staff.filter((p) => p.is_archived).length + citizens.filter((p) => p.is_archived).length,
    [staff, citizens]
  );

  async function handleArchive(account) {
    setBusy(true);
    setActionError("");
    try {
      await archiveAccount(account.id);
      await load();
      setViewing(null);
    } catch (err) {
      setActionError(err.message || "Couldn't archive this account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(account) {
    setBusy(true);
    setActionError("");
    try {
      await restoreAccount(account.id);
      await load();
      setViewing(null);
    } catch (err) {
      setActionError(err.message || "Couldn't restore this account.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="empty-state">Loading accounts…</p>;

  return (
    <>
      <div className="stat-grid">
        <StatCard icon={Users} label="Total Accounts" value={counts.total} tone="navy" />
        <StatCard icon={UserCog} label="Dispatchers" value={counts.dispatchers} tone="orange" />
        <StatCard icon={Shield} label="Admins" value={counts.admins} tone="gold" />
        <StatCard icon={Users} label="Citizens" value={counts.citizens} tone="info" />
      </div>

      {error && <p className="error-text">{error}</p>}
      {actionError && <p className="error-text">{actionError}</p>}

      <div className="panel">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div className="chip-row">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`chip${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived {archivedCount > 0 ? `(${archivedCount})` : ""}
            </label>
            <button className="btn-mini primary" onClick={() => setShowCreate(true)}>
              <UserPlus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              Create Dispatcher Account
            </button>
          </div>
        </div>

        {tab === "staff" ? (
          visibleStaff.length === 0 ? (
            <div className="empty-state">No dispatcher or admin accounts yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Agency</th>
                    <th>Municipality</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map((p) => (
                    <tr key={p.id} style={{ opacity: p.is_archived ? 0.55 : 1 }}>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{displayName(p)}</td>
                      <td>{p.email ?? "—"}</td>
                      <td>
                        <span className={`status-pill role-${p.role}`}>{p.role}</span>
                        {p.is_archived && (
                          <span className="status-pill" style={{ marginLeft: 6, background: "#eef1f5", color: "#8a929c" }}>
                            Archived
                          </span>
                        )}
                      </td>
                      <td>
                        {p.agency ? (
                          <span className="media-badge">{p.agency}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 11.5 }}>—</span>
                        )}
                      </td>
                      <td>{p.municipality || "—"}</td>
                      <td>
                        <button className="btn-mini" onClick={() => setViewing(p)}>
                          <Eye size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : visibleCitizens.length === 0 ? (
          <div className="empty-state">No citizen accounts yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Municipality</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleCitizens.map((p) => (
                  <tr key={p.id} style={{ opacity: p.is_archived ? 0.55 : 1 }}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {displayName(p)}
                      {p.is_archived && (
                        <span className="status-pill" style={{ marginLeft: 6, background: "#eef1f5", color: "#8a929c" }}>
                          Archived
                        </span>
                      )}
                    </td>
                    <td>{p.email ?? "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>{p.municipality || "—"}</td>
                    <td>
                      <button className="btn-mini" onClick={() => setViewing(p)}>
                        <Eye size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateAccountModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {viewing && (
        <AccountDetailModal
          account={viewing}
          onClose={() => { setViewing(null); setActionError(""); }}
          onArchive={handleArchive}
          onRestore={handleRestore}
          busy={busy}
          isSelf={viewing.id === user?.id}
        />
      )}
    </>
  );
}
