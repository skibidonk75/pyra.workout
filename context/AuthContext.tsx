import { Session, User } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert, Platform } from "react-native";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, "display_name">>) => Promise<void>;
  uploadAvatar: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load session on mount ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchProfile(data.session.user.id);
      else setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Fetch / create profile row ─────────────────────────────────────────────
  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("fetchProfile error:", error);
      }
      setProfile(data ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Insert profile row immediately so it exists before the onAuthStateChange
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          display_name: displayName || null,
          avatar_url: null,
        });
      }
    },
    []
  );

  // ── Sign In ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ── Update display name ────────────────────────────────────────────────────
  const updateProfile = useCallback(
    async (updates: Partial<Pick<UserProfile, "display_name">>) => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, ...updates } : p));
    },
    [user]
  );

  // ── Upload avatar ──────────────────────────────────────────────────────────
  const uploadAvatar = useCallback(async () => {
    if (!user) return;

    // Ask for permission
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to change your profile picture."
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    try {
      // Build a unique file path per user
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage bucket "avatars"
      let uploadBody: Blob | ArrayBuffer;
      if (Platform.OS === "web") {
        const res = await fetch(asset.uri);
        uploadBody = await res.blob();
      } else {
        // On native, use base64 → ArrayBuffer
        const b64 = asset.base64!;
        const binary = atob(b64);
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
        uploadBody = buffer.buffer;
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, uploadBody, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatar_url = data.publicUrl;

      // Persist to profiles table
      await supabase.from("profiles").update({ avatar_url }).eq("id", user.id);
      setProfile((p) => (p ? { ...p, avatar_url } : p));
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Could not upload photo.");
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
