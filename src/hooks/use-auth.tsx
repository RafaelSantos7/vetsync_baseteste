import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole, type AppRole } from "@/lib/permissions";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  organizationId: string | null;
  role: string;
  roleLoaded: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  organizationId: null,
  role: 'reception',
  roleLoaded: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<string>('reception');
  const [roleLoaded, setRoleLoaded] = useState(false);


  useEffect(() => {
    // admin > veterinarian > reception
    const RANK: Record<string, number> = { admin: 3, veterinarian: 2, reception: 1 };
    
    const best = (...roles: (string | undefined | null)[]) => {
      let winner: AppRole = 'reception';
      for (const r of roles) {
        if (!r) continue;
        const n = normalizeRole(r);
        if (RANK[n] > RANK[winner]) {
          winner = n;
        }
      }
      return winner;
    };

    const fetchOrg = async (uid: string, metaRole?: string) => {
      try {
        if (import.meta.env.DEV) console.log(`[Auth] Fetching roles for user ${uid}`);

        const [{ data: members, error: memErr }, { data: appRoles, error: roleErr }] = await Promise.all([
          supabase
            .from("organization_members")
            .select("organization_id, role")
            .eq("user_id", uid)
            .limit(1),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid),
        ]);

        if (memErr) console.error("[Auth] Error fetching organization_members:", memErr);
        if (roleErr) console.error("[Auth] Error fetching user_roles:", roleErr);

        if (members?.[0]) setOrganizationId(members[0].organization_id);

        const calculatedRole = best(
          members?.[0]?.role, 
          ...(appRoles ?? []).map((r) => r.role), 
          metaRole
        );

        if (import.meta.env.DEV) {
          console.log("[Auth] Roles found:", {
            org_member: members?.[0]?.role,
            user_roles: (appRoles ?? []).map(r => r.role),
            app_metadata: metaRole,
            FINAL_NORMALIZED: calculatedRole
          });
        }

        setRole(calculatedRole);
      } catch (err) {
        console.error("[Auth] Critical error in fetchOrg:", err);
      } finally {
        setRoleLoaded(true);
      }
    };



    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchOrg(s.user.id, s.user.app_metadata?.role);
      else {
        setOrganizationId(null);
        setRole('reception');
        setRoleLoaded(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchOrg(data.session.user.id, data.session.user.app_metadata?.role);
      else setRoleLoaded(true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ 
      user, 
      session, 
      loading, 
      organizationId,
      role,
      roleLoaded,
      signOut: async () => { await supabase.auth.signOut(); } 
    }}>

      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
