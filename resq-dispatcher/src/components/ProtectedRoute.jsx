import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, profile } = useAuth();

  if (user === undefined) {
    return <div className="full-screen-loading">Loading…</div>;
  }
  if (!user || !profile || (profile.role !== "dispatcher" && profile.role !== "admin")) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
