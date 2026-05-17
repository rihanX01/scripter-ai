import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "max";
  is_banned: boolean;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string) => {
    const [{ data: prof, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name,avatar_url,plan,is_banned").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (profileError) console.error("Profile load failed", profileError);
    if (rolesError) console.error("Role load failed", rolesError);
    setProfile(profileError ? null : (prof as Profile | null));
    setIsAdmin(!rolesError && !!roles?.some((r) => r.role === "admin"));
  };

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    try {
      if (data.session?.user) await loadExtras(data.session.user.id);
      else { setProfile(null); setIsAdmin(false); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => {
          loadExtras(s.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null); setIsAdmin(false);
        setLoading(false);
      }
    });
    refresh();
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
