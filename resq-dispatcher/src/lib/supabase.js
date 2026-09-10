import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.local.example to .env.local and fill in the SAME Supabase project the citizen app (resq-partido) uses, so both apps read/write the same incidents table."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
