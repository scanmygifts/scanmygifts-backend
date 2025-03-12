import { createClient } from "@supabase/supabase-js";

// Load Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Throw an error if credentials are missing
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_KEY are set in Render.");
    throw new Error("Missing Supabase credentials");
}

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("✅ Supabase client initialized successfully.");
