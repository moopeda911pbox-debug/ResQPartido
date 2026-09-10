// ResQPartido — admin-only dispatcher/admin account creation.
//
// Why this has to be an Edge Function and not client-side code: creating a
// Supabase Auth user for someone else requires supabase.auth.admin.createUser(),
// which only works with the service_role key. That key must never ship in
// the browser bundle (see scripts/seed-dispatchers.js's warning), so this
// runs server-side instead. The browser calls this function; this function
// holds the service_role key as a Supabase-managed secret.
//
// Deploy:
//   supabase functions deploy create-dispatcher
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by the Supabase platform — nothing extra to configure.
//
// Access control: only a signed-in account with profiles.role = 'admin' can
// call this successfully. Everyone else gets 401/403. To create the very
// first admin (bootstrapping — there's no admin yet to use this form), run
// once in the Supabase SQL editor:
//   update public.profiles set role = 'admin' where email = 'you@example.com';

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AGENCIES = ["PNP", "BFP", "MDRRMO"];
const ROLES = ["dispatcher", "admin"];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server misconfigured — missing Supabase env vars." }, 500);
  }

  // --- 1. Who is calling? Client scoped to the caller's own JWT, so this
  // respects RLS just like any signed-in user would get. ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "Not signed in." }, 401);
  }

  const { data: callerProfile, error: callerProfileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (callerProfileError || callerProfile?.role !== "admin") {
    return json({ error: "Only an admin account can create dispatcher accounts." }, 403);
  }

  // --- 2. Validate the new-account payload. ---
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const municipality = body.municipality ? String(body.municipality).trim() : null;
  const role = ROLES.includes(String(body.role)) ? String(body.role) : "dispatcher";
  const agency = body.agency ? String(body.agency).trim() : null;

  if (!firstName || !lastName || !email || !password) {
    return json({ error: "First name, last name, email, and password are all required." }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, 400);
  }
  if (role === "dispatcher" && !AGENCIES.includes(agency ?? "")) {
    return json({ error: "Pick an agency (PNP, BFP, or MDRRMO) for a dispatcher account." }, 400);
  }

  // --- 3. Create the auth user + profile with the service role key. ---
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createError) {
    const msg = createError.message?.toLowerCase().includes("already registered")
      ? "An account with that email already exists."
      : createError.message || "Couldn't create the account.";
    return json({ error: msg }, 409);
  }

  const userId = created.user.id;
  const finalAgency = role === "dispatcher" ? agency : null;

  const { error: upsertError } = await adminClient.from("profiles").upsert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    municipality,
    agency: finalAgency,
    role,
  });

  if (upsertError) {
    return json(
      { error: `Account created but the profile couldn't be saved: ${upsertError.message}` },
      500
    );
  }

  return json({
    id: userId,
    email,
    firstName,
    lastName,
    municipality,
    agency: finalAgency,
    role,
    password,
  });
});
