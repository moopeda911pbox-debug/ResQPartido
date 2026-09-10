import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Dashboard / Manage Alerts / Manage Reports / Analytics are dispatcher-only
// now — an admin account is limited to Manage Accounts and Settings (see
// AdminRoute for the reverse restriction). If an admin lands here directly
// (e.g. a bookmarked URL), send them to Manage Accounts instead.
export default function DispatcherRoute({ children }) {
  const { user, profile } = useAuth();

  if (user === undefined) {
    return <div className="full-screen-loading">Loading…</div>;
  }
  if (profile?.role === "admin") {
    return <Navigate to="/admin/accounts" replace />;
  }
  return children;
}
