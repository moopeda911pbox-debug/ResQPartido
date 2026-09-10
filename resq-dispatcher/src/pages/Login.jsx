import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import resqpartidoLogo from "../assets/resqpartido-logo.png";

export default function Login() {
  const { login } = useAuth();
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
      await login(email, password);
      navigate("/");
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
            <div className="tag">DISPATCHER CONSOLE</div>
          </div>
        </div>
        <h2>Dispatcher sign in</h2>
        <p className="hint">Use your dispatcher account to view live reports from the citizen app.</p>

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
          Signing in as an admin?{" "}
          <Link to="/admin/login" style={{ color: "var(--orange)", fontWeight: 700 }}>
            Admin sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}
