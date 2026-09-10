import { supabase } from "./supabase";

export const AGENCIES = ["PNP", "BFP", "MDRRMO"];
export const MUNICIPALITIES = ["Goa", "San Jose", "Lagonoy", "Tigaon", "Sangay"];

// Same scheme as scripts/seed-dispatchers.js: random bytes -> base64url,
// trimmed to a clean 16-char temp password.
export function generateTempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 16);
}

// Calls the create-dispatcher Edge Function (admin-only; the service role
// key it needs never touches the browser). Throws with a readable message
// on any failure so callers can just show err.message.
export async function createDispatcherAccount(payload) {
  const { data, error } = await supabase.functions.invoke("create-dispatcher", { body: payload });

  if (error) {
    let message = error.message || "Couldn't create the account.";
    try {
      const responseBody = await error.context?.json?.();
      if (responseBody?.error) message = responseBody.error;
    } catch {
      // fall back to error.message above
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// Reads every profile the caller is allowed to see (RLS already lets any
// dispatcher/admin read all profiles — see "profiles: dispatcher read all"
// in supabase/dispatcher_schema.sql) and splits them into staff vs citizens.
export async function fetchAllAccounts() {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;

  const rows = data ?? [];
  const byName = (a, b) => `${a.first_name ?? ""} ${a.last_name ?? ""}`.localeCompare(`${b.first_name ?? ""} ${b.last_name ?? ""}`);

  const staff = rows
    .filter((r) => r.role === "dispatcher" || r.role === "admin")
    .sort((a, b) => (a.role === b.role ? byName(a, b) : a.role === "admin" ? -1 : 1));

  const citizens = rows
    .filter((r) => !r.role || r.role === "citizen")
    .sort(byName);

  return { staff, citizens, total: rows.length };
}

// Archive/restore — admin-only per "profiles: admin archive toggle" in
// supabase/archive_accounts_schema.sql. Archiving is reversible and blocks
// the account from signing in (enforced in both apps' sign-in code) without
// deleting any of its data.
export async function archiveAccount(id) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreAccount(id) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_archived: false, archived_at: null })
    .eq("id", id);
  if (error) throw error;
}
