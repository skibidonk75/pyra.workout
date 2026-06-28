import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// ─── Fill these in after creating your Supabase project ───────────────────────
// 1. Go to https://supabase.com → New project
// 2. Project Settings → API → copy "Project URL" and "anon public" key
// 3. Paste them below (or set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
//    in your .env / Vercel / Cloudflare environment variables)
// ──────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "YOUR_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Use AsyncStorage on mobile, localStorage on web
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
