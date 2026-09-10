// One-time setup script: creates 5 dispatcher accounts, one per
// municipality, each tagged with the responding agency they log in as.
//
// Usage:
//   1. In Supabase: Project Settings > API > copy the "service_role" key
//      (NOT the anon key — this script needs admin rights to create users).
//   2. Run from the resq-dispatcher folder:
//        SUPABASE_URL="https://xxxx.supabase.co" \
//        SUPABASE_SERVICE_ROLE_KEY="ey..." \
//        node scripts/seed-dispatchers.js
//   3. Copy the printed emails/passwords somewhere safe and hand them to
//      each agency. Never commit the service role key or this output.
//
// Safe to re-run: accounts that already exist are skipped, not duplicated.

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Set both as environment variables before running this script."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// One login per municipality. Agency picked to spread coverage across the
// three responder types — edit freely before running if you want a
// different pairing (e.g. every municipality on MDRRMO, or vice versa).
const ACCOUNTS = [
  { municipality: "Goa", agency: "MDRRMO", email: "mdrrmo.goa@resqpartido.local" },
  { municipality: "San Jose", agency: "PNP", email: "pnp.sanjose@resqpartido.local" },
  { municipality: "Lagonoy", agency: "BFP", email: "bfp.lagonoy@resqpartido.local" },
  { municipality: "Tigaon", agency: "MDRRMO", email: "mdrrmo.tigaon@resqpartido.local" },
  { municipality: "Sangay", agency: "PNP", email: "pnp.sangay@resqpartido.local" },
];

function generatePassword() {
  // 12 random bytes -> base64url, trimmed to a clean 16-char temp password.
  return crypto.randomBytes(12).toString("base64url").slice(0, 16);
}

async function ensureDispatcher({ municipality, agency, email }) {
  const password = generatePassword();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: agency, last_name: `Dispatch — ${municipality}` },
  });

  let userId = created?.user?.id;

  if (createError) {
    // Already exists — look the user up instead of failing the whole run.
    if (createError.message?.toLowerCase().includes("already registered")) {
      const { data: list, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = list.users.find((u) => u.email === email);
      if (!existing) throw new Error(`Couldn't find existing user for ${email}`);
      userId = existing.id;
      console.log(`↺ ${email} already exists — updating profile only (password unchanged).`);
    } else {
      throw createError;
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email,
      first_name: agency,
      last_name: `Dispatch — ${municipality}`,
      municipality,
      agency,
      role: "dispatcher",
    });
  if (profileError) throw profileError;

  return { email, municipality, agency, password: createError ? "(unchanged)" : password };
}

async function main() {
  const results = [];
  for (const account of ACCOUNTS) {
    try {
      results.push(await ensureDispatcher(account));
    } catch (err) {
      console.error(`✗ Failed for ${account.email}:`, err.message || err);
    }
  }

  console.log("\nDispatcher accounts ready:\n");
  console.log("Municipality  | Agency  | Email                          | Temp Password");
  console.log("--------------|---------|--------------------------------|----------------");
  for (const r of results) {
    console.log(
      `${r.municipality.padEnd(13)} | ${r.agency.padEnd(7)} | ${r.email.padEnd(30)} | ${r.password}`
    );
  }
  console.log(
    "\nShare each row with the matching agency, and have them change their password " +
    "after first login (Settings > Change Password in the dispatcher console)."
  );
}

main();
