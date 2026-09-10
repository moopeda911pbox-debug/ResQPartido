import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import DispatcherRoute from "./components/DispatcherRoute";
import DispatcherLayout from "./components/DispatcherLayout";

import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import ManageAlerts from "./pages/ManageAlerts";
import ManageReports from "./pages/ManageReports";
import AnalyticsReport from "./pages/AnalyticsReport";
import ManageAccounts from "./pages/ManageAccounts";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DispatcherLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <DispatcherRoute>
              <Dashboard />
            </DispatcherRoute>
          }
        />
        <Route
          path="alerts"
          element={
            <DispatcherRoute>
              <ManageAlerts />
            </DispatcherRoute>
          }
        />
        <Route
          path="reports"
          element={
            <DispatcherRoute>
              <ManageReports />
            </DispatcherRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <DispatcherRoute>
              <AnalyticsReport />
            </DispatcherRoute>
          }
        />
        <Route
          path="admin/accounts"
          element={
            <AdminRoute>
              <ManageAccounts />
            </AdminRoute>
          }
        />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
