import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  username: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (username: string, email: string, password: string, inviteKey: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (roleData) {
        setRole(roleData.role as AppRole);
      }

      // Fetch username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileData) {
        setUsername(profileData.username);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setUsername(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (usernameInput: string, password: string) => {
    try {
      // Get user's email from profiles by username using RPC function (bypasses RLS)
      const { data: email, error: lookupError } = await supabase
        .rpc('get_email_by_username', { _username: usernameInput });

      if (lookupError || !email) {
        return { error: new Error('Username atau password salah') };
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: new Error('Username atau password salah') };
      }

      // Check if user is suspended
      if (authData.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_suspended')
          .eq('id', authData.user.id)
          .maybeSingle();

        if ((profileData as any)?.is_suspended) {
          // Sign out the suspended user immediately
          await supabase.auth.signOut();
          return { error: new Error('Akun Anda telah di-suspend. Hubungi admin untuk informasi lebih lanjut.') };
        }
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (usernameInput: string, email: string, password: string, inviteKey: string) => {
    try {
      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameInput)) {
        return { error: new Error('Username harus 3-20 karakter, hanya huruf, angka, dan underscore') };
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: new Error('Format email tidak valid') };
      }

      // Check if invite key is valid and get preset limits
      const { data: keyData, error: keyError } = await supabase
        .from('invite_keys')
        .select('id, preset_max_droplets, preset_allowed_sizes, preset_auto_destroy_days, current_uses, max_uses')
        .eq('key', inviteKey)
        .eq('is_active', true)
        .maybeSingle();

      if (keyError || !keyData) {
        return { error: new Error('Invite key tidak valid atau sudah digunakan') };
      }

      // Check if key still has uses left
      const keyInfo = keyData as any;
      if (keyInfo.current_uses >= keyInfo.max_uses) {
        return { error: new Error('Invite key sudah mencapai batas penggunaan') };
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameInput.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return { error: new Error('Username sudah digunakan') };
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: usernameInput.toLowerCase(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          return { error: new Error('Username sudah terdaftar') };
        }
        return { error: signUpError };
      }

      // Mark invite key as used and apply preset limits
      if (signUpData.user) {
        // Update invite key usage count
        await supabase
          .from('invite_keys')
          .update({ 
            current_uses: keyInfo.current_uses + 1,
            used_by: signUpData.user.id,
            used_at: new Date().toISOString(),
          } as any)
          .eq('id', keyInfo.id);

        // Create user limits based on invite key presets
        await supabase
          .from('user_limits')
          .insert({
            user_id: signUpData.user.id,
            max_droplets: keyInfo.preset_max_droplets || 3,
            allowed_sizes: keyInfo.preset_allowed_sizes || ['s-1vcpu-512mb-10gb', 's-1vcpu-1gb', 's-1vcpu-2gb', 's-2vcpu-2gb', 's-2vcpu-4gb', 's-4vcpu-8gb', 's-8vcpu-16gb'],
            auto_destroy_days: keyInfo.preset_auto_destroy_days || 0,
          } as any);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      username,
      isLoading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
