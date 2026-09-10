import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  getSoundPref, setSoundPref, getDesktopPref, setDesktopPref, requestDesktopPermission,
} from "../lib/alerts";

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-switch${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export default function Settings() {
  const { profile, user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // --- Edit profile ---
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
  }, [profile]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile?.();
      setProfileMsg({ type: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message || "Couldn't update your profile." });
    } finally {
      setSavingProfile(false);
    }
  }

  // --- Change password ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password changed." });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.message || "Couldn't change your password." });
    } finally {
      setSavingPassword(false);
    }
  }

  // --- Alert preferences ---
  const [soundOn, setSoundOn] = useState(getSoundPref());
  const [desktopOn, setDesktopOn] = useState(getDesktopPref());
  const [permissionWarning, setPermissionWarning] = useState("");

  function toggleSound(next) {
    setSoundOn(next);
    setSoundPref(next);
  }

  async function toggleDesktop(next) {
    setPermissionWarning("");
    if (next) {
      const result = await requestDesktopPermission();
      if (result !== "granted") {
        setPermissionWarning(
          result === "denied"
            ? "Desktop notifications are blocked for this site in your browser settings."
            : "Desktop notifications aren't supported in this browser."
        );
        setDesktopOn(false);
        setDesktopPref(false);
        return;
      }
    }
    setDesktopOn(next);
    setDesktopPref(next);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="panel">
        <div className="panel-header">
          <h2>My Account</h2>
          <span className="sub">{user?.email}</span>
        </div>
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Role</label>
            <input value={profile?.role ?? "—"} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label>Agency</label>
            <input value={profile?.agency ?? "—"} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label>Municipality</label>
            <input value={profile?.municipality ?? "—"} disabled style={{ opacity: 0.6 }} />
          </div>

          {profileMsg.type === "error" && <p className="error-text">{profileMsg.text}</p>}
          {profileMsg.type === "success" && <p className="success-text">{profileMsg.text}</p>}

          <button className="btn-mini primary" type="submit" disabled={savingProfile} style={{ padding: "8px 16px", fontSize: 12.5 }}>
            {savingProfile ? "Saving…" : "Save Changes"}
          </button>
        </form>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 14 }}>
          Role, agency, and municipality are assigned by an admin from the Supabase dashboard
          (profiles.role / profiles.agency / profiles.municipality) — see
          supabase/dispatcher_agency_schema.sql and scripts/seed-dispatchers.js.
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword}>
          <div className="field">
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          {passwordMsg.type === "error" && <p className="error-text">{passwordMsg.text}</p>}
          {passwordMsg.type === "success" && <p className="success-text">{passwordMsg.text}</p>}

          <button className="btn-mini primary" type="submit" disabled={savingPassword} style={{ padding: "8px 16px", fontSize: 12.5 }}>
            {savingPassword ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Alert Preferences</h2>
          <span className="sub">How this browser reacts to a new SOS</span>
        </div>
        <div className="settings-row">
          <div>
            <p className="label">Sound alert</p>
            <p className="desc">Play a short beep when a new SOS comes in while this tab is open.</p>
          </div>
          <ToggleSwitch checked={soundOn} onChange={toggleSound} />
        </div>
        <div className="settings-row">
          <div>
            <p className="label">Desktop notification</p>
            <p className="desc">Show a browser notification for new SOS alerts, even if this tab isn't focused.</p>
          </div>
          <ToggleSwitch checked={desktopOn} onChange={toggleDesktop} />
        </div>
        {permissionWarning && <p className="error-text" style={{ marginTop: 10 }}>{permissionWarning}</p>}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Session</h2>
        </div>
        <button className="btn-mini" onClick={handleLogout} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
          Log Out
        </button>
      </div>
    </div>
  );
}
