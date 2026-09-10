import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import resqpartidoLogo from "../assets/resqpartido-logo.png";

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginAdmin(email, password);
      navigate("/admin/accounts");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand">
          <img src={resqpartidoLogo} alt="ResQPartido" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <div>
            <div className="name">ResQ<span>Partido</span></div>
            <div className="tag">ADMIN CONSOLE</div>
          </div>
        </div>
        <h2>Admin sign in</h2>
        <p className="hint">Sign in with an admin account to manage dispatcher accounts and agency assignments.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="hint" style={{ marginTop: 16, marginBottom: 0, textAlign: "center" }}>
          Not an admin?{" "}
          <Link to="/login" style={{ color: "var(--orange)", fontWeight: 700 }}>
            Dispatcher sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
