import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, AlertTriangle, FileText, BarChart3, UserCog, Settings, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import resqpartidoLogo from "../assets/resqpartido-logo.png";

const DISPATCHER_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/alerts", label: "Manage Alerts", icon: AlertTriangle },
  { to: "/reports", label: "Manage Reports", icon: FileText },
  { to: "/analytics", label: "Analytics & Report", icon: BarChart3 },
  { to: "/settings", label: "Setting", icon: Settings },
];

// Admin accounts are limited to just these two — everything else on the
// dispatcher menu is off-limits (see DispatcherRoute).
const ADMIN_LINKS = [
  { to: "/admin/accounts", label: "Manage Accounts", icon: UserCog },
  { to: "/settings", label: "Setting", icon: Settings },
];

export default function Sidebar({ pendingCount = 0 }) {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const links = isAdmin ? ADMIN_LINKS : DISPATCHER_LINKS;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={resqpartidoLogo} alt="ResQPartido" style={{ width: 36, height: 36, objectFit: "contain" }} />
        <div>
          <div className="name">ResQ<span>Partido</span></div>
          <div className="tag">{isAdmin ? "ADMIN CONSOLE" : "DISPATCHER CONSOLE"}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <Icon size={16} />
            {label}
            {label === "Manage Alerts" && pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );
}
