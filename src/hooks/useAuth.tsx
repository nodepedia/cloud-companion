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
  signUp: (
    username: string,
    email: string,
    password: string,
    inviteKey: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
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

  const signIn = async (usernameOrEmailInput: string, password: string) => {
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usernameOrEmailInput.trim());

      let emailToUse: string | null = null;

      if (isEmail) {
        emailToUse = usernameOrEmailInput.trim();
      } else {
        // Get user's email from username using RPC function (bypasses RLS)
        const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', {
          _username: usernameOrEmailInput,
        });

        if (lookupError || !email) {
          return {
            error: new Error(
              'Username tidak ditemukan. Coba login pakai EMAIL (isi kolom ini dengan email) atau hubungi admin.'
            ),
          };
        }

        emailToUse = email;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('email not confirmed')) {
          return { error: new Error('Email belum dikonfirmasi. Cek inbox/spam untuk link verifikasi (atau matikan “Confirm email” saat testing).') };
        }
        if (msg.includes('invalid login credentials')) {
          return { error: new Error('Username atau password salah') };
        }
        return { error: new Error(error.message) };
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

      // Check if username is already taken (case-insensitive)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', usernameInput.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        return { error: new Error('Username sudah digunakan') };
      }

      const redirectUrl = `${window.location.origin}/auth?mode=login`;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: usernameInput.toLowerCase(),
          },
        },
      });

      if (signUpError) {
        // Supabase returns "already registered" when the EMAIL already exists
        if (signUpError.message.toLowerCase().includes('already registered')) {
          return { error: new Error('Email sudah terdaftar. Silakan login atau gunakan email lain.') };
        }
        return { error: signUpError };
      }

      const needsEmailConfirmation = !signUpData.session;

      // Apply invite key usage and preset limits using RPC (security definer)
      if (signUpData.user) {
        const { data: applyResult, error: applyError } = await supabase.rpc('apply_invite_limits', {
          _key: inviteKey,
          _user_id: signUpData.user.id,
        });

        if (applyError) {
          console.error('Failed to apply invite limits:', applyError);
          // Don't fail the signup, just log the error - user can still use defaults
        } else if (applyResult === false) {
          console.warn('Invite key limits not applied - key may be invalid or exhausted');
        }
      }

      return { error: null, needsEmailConfirmation };
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
