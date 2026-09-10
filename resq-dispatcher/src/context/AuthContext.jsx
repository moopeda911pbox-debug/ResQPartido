import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState("");

  const ARCHIVED_MESSAGE = "This account has been archived. Contact an administrator to have it restored.";

  async function loadProfile(userId) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      setProfile(null);
      return null;
    }
    setProfile(data);
    return data;
  }

  // Shared by the passive session-restore path below and the explicit
  // login flows further down — an archived account is signed back out the
  // moment we notice, whether that's from a fresh login or an old session
  // that got archived while it wasn't looking.
  async function rejectIfArchived(p) {
    if (!p?.is_archived) return false;
    await supabase.auth.signOut();
    setProfile(null);
    setAuthError(ARCHIVED_MESSAGE);
    return true;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const p = await loadProfile(sessionUser.id);
        if (await rejectIfArchived(p)) setUser(null);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await loadProfile(session.user.id);
        if (await rejectIfArchived(p)) setUser(null);
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function authenticateAs(email, password, requiredRole, wrongRoleMessages, notSetUpMessage) {
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    const p = await loadProfile(data.user.id);
    if (await rejectIfArchived(p)) throw new Error(ARCHIVED_MESSAGE);
    if (!p || p.role !== requiredRole) {
      await supabase.auth.signOut();
      const msg = (p?.role && wrongRoleMessages[p.role]) || notSetUpMessage;
      setAuthError(msg);
      throw new Error(msg);
    }
    return data;
  }

  // Dispatcher console sign-in (/login) — admin accounts are pointed to the
  // separate admin sign-in instead of being let in here.
  async function login(email, password) {
    return authenticateAs(
      email,
      password,
      "dispatcher",
      { admin: "This is an admin account — use the admin sign-in instead." },
      "This account isn't set up for dispatcher access. Ask an admin to grant the dispatcher role."
    );
  }

  // Admin console sign-in (/admin/login) — kept separate from the dispatcher
  // login above; a dispatcher account can't authenticate here.
  async function loginAdmin(email, password) {
    return authenticateAs(
      email,
      password,
      "admin",
      { dispatcher: "This is a dispatcher account — use the dispatcher sign-in instead." },
      "This account isn't set up for admin access."
    );
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthCtx.Provider
      value={{ user, profile, login, loginAdmin, logout, authError, refreshProfile: () => user && loadProfile(user.id) }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
