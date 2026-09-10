import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Like ProtectedRoute, but for screens only an admin should reach (e.g.
// creating dispatcher accounts). A signed-in dispatcher who isn't an admin
// gets bounced to the dashboard rather than the login screen.
export default function AdminRoute({ children }) {
  const { user, profile } = useAuth();

  if (user === undefined) {
    return <div className="full-screen-loading">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
