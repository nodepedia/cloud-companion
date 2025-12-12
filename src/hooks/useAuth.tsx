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
  signUp: (username: string, password: string, inviteKey: string) => Promise<{ error: Error | null }>;
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
      // Get email from username (we use username@cloudmanager.local as fake email)
      const fakeEmail = `${usernameInput.toLowerCase()}@cloudmanager.local`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });
      
      if (error) {
        return { error: new Error('Username atau password salah') };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (usernameInput: string, password: string, inviteKey: string) => {
    try {
      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameInput)) {
        return { error: new Error('Username harus 3-20 karakter, hanya huruf, angka, dan underscore') };
      }

      // Check if invite key is valid
      const { data: keyData, error: keyError } = await supabase
        .from('invite_keys')
        .select('id')
        .eq('key', inviteKey)
        .eq('is_active', true)
        .is('used_by', null)
        .maybeSingle();

      if (keyError || !keyData) {
        return { error: new Error('Invite key tidak valid atau sudah digunakan') };
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

      // Create user with fake email (username@cloudmanager.local)
      const fakeEmail = `${usernameInput.toLowerCase()}@cloudmanager.local`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: fakeEmail,
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

      // Mark invite key as used
      if (signUpData.user) {
        await supabase.rpc('use_invite_key', {
          _key: inviteKey,
          _user_id: signUpData.user.id,
        });
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
