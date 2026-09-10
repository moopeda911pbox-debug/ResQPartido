import React, { useState } from "react";
import { X } from "lucide-react";
import { AGENCIES, MUNICIPALITIES, createDispatcherAccount, generateTempPassword } from "../lib/adminAccounts";

export default function CreateAccountModal({ onClose, onCreated }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generateTempPassword());
  const [role, setRole] = useState("dispatcher");
  const [agency, setAgency] = useState(AGENCIES[0]);
  const [municipality, setMunicipality] = useState(MUNICIPALITIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const account = await createDispatcherAccount({
        firstName,
        lastName,
        email,
        password,
        role,
        agency: role === "dispatcher" ? agency : null,
        municipality,
      });
      setResult(account);
      onCreated?.();
    } catch (err) {
      setError(err.message || "Couldn't create the account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="detail-header">
          <h2>{result ? "Account Created" : "Create Dispatcher Account"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="detail-section">
            <p className="success-text">
              The account is ready. Share these credentials securely — have them change the
              password after first login (Settings &gt; Change Password).
            </p>
            <div className="field">
              <label>Email</label>
              <input value={result.email} readOnly />
            </div>
            <div className="field">
              <label>Temporary password</label>
              <input value={result.password} readOnly />
            </div>
            <div className="field">
              <label>Role</label>
              <input value={result.role} readOnly />
            </div>
            {result.agency && (
              <div className="field">
                <label>Agency</label>
                <input value={result.agency} readOnly />
              </div>
            )}
            <button className="btn-primary" onClick={onClose} style={{ marginTop: 4 }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="two-col-fields">
              <div className="field">
                <label>First name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
              </div>
              <div className="field">
                <label>Last name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="field">
              <label>Temporary password</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-mini"
                  style={{ margin: 0, whiteSpace: "nowrap" }}
                  onClick={() => setPassword(generateTempPassword())}
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="two-col-fields">
              <div className="field">
                <label>Account type</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="field">
                <label>Agency{role !== "dispatcher" && " (dispatcher only)"}</label>
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  disabled={role !== "dispatcher"}
                >
                  {AGENCIES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Municipality</label>
              <select value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
                {MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: 4 }}>
              {submitting ? "Creating…" : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
