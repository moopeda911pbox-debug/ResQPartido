import React, { useState } from "react";
import { X, Archive, RotateCcw } from "lucide-react";

function displayName(p) {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—";
}

function fmt(value) {
  return value || value === 0 ? value : "—";
}

export default function AccountDetailModal({ account, onClose, onArchive, onRestore, busy, isSelf }) {
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  if (!account) return null;
  const isStaff = account.role === "dispatcher" || account.role === "admin";

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="detail-header">
          <div>
            <h2>{displayName(account)}</h2>
            <span className={`status-pill role-${account.role || "citizen"}`}>{account.role || "citizen"}</span>{" "}
            {account.is_archived && <span className="status-pill" style={{ background: "#eef1f5", color: "#8a929c" }}>Archived</span>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="detail-meta">
          <div>
            <span className="label">Email</span>
            <p>{fmt(account.email)}</p>
          </div>
          <div>
            <span className="label">Phone</span>
            <p>{fmt(account.phone)}</p>
          </div>
          <div>
            <span className="label">Municipality</span>
            <p>{fmt(account.municipality)}</p>
          </div>
          <div>
            <span className="label">Address</span>
            <p>{fmt(account.address)}</p>
          </div>
          <div>
            <span className="label">Date of birth</span>
            <p>{fmt(account.date_of_birth)}</p>
          </div>
          <div>
            <span className="label">Gender</span>
            <p>{fmt(account.gender)}</p>
          </div>
          {isStaff && (
            <div>
              <span className="label">Agency</span>
              <p>{fmt(account.agency)}</p>
            </div>
          )}
          <div>
            <span className="label">Account created</span>
            <p>{account.created_at ? new Date(account.created_at).toLocaleString() : "—"}</p>
          </div>
          {account.is_archived && (
            <div>
              <span className="label">Archived</span>
              <p>{account.archived_at ? new Date(account.archived_at).toLocaleString() : "—"}</p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
          {isSelf ? (
            <span style={{ fontSize: 12, color: "#8a929c" }}>You can't archive your own account.</span>
          ) : account.is_archived ? (
            <button className="btn-mini success" disabled={busy} onClick={() => onRestore(account)}>
              <RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              {busy ? "Restoring…" : "Restore Account"}
            </button>
          ) : confirmingArchive ? (
            <>
              <span style={{ fontSize: 12, color: "#8a929c" }}>Archive this account? They won't be able to sign in.</span>
              <button
                className="btn-mini"
                style={{ background: "#ffe3e3", color: "#d92b2b", borderColor: "#ffcccc" }}
                disabled={busy}
                onClick={() => onArchive(account)}
              >
                {busy ? "Archiving…" : "Yes, archive"}
              </button>
              <button className="btn-mini" disabled={busy} onClick={() => setConfirmingArchive(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn-mini" style={{ color: "#d92b2b" }} onClick={() => setConfirmingArchive(true)}>
              <Archive size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              Archive Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
