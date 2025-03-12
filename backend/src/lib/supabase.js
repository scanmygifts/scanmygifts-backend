import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // ✅ Use correct variable from Render

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase credentials in backend");
    throw new Error("Missing Supabase credentials");
}

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("✅ Supabase client initialized successfully.");
