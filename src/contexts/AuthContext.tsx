import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, User } from '../lib/supabase';

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: User | null;
  loading: boolean;
  profileError: string | null; // Adicionado para tratar erros de perfil
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null); // Estado para erro

  const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
    console.log(`[AuthContext] 🔍 fetchUserProfile: Buscando perfil para ${authUser.email} (ID: ${authUser.id})`);
    setProfileError(null); // Limpa erro anterior

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('[AuthContext] ❌ fetchUserProfile: Erro ao buscar usuário por ID.', error);
        // Fallback para email não é mais necessário se o ID do auth.user é a fonte da verdade.
        // O problema é que o usuário pode não existir na tabela 'users'.
        const errorMessage = 'Seu perfil de usuário não foi encontrado no sistema. Entre em contato com o suporte.';
        console.error(`[AuthContext] ❌ fetchUserProfile: ${errorMessage}`);
        setProfileError(errorMessage);
        return null;
      }

      console.log(`[AuthContext] ✅ fetchUserProfile: Perfil encontrado para ${data.name} (Tipo: ${data.user_type})`);
      return data;
    } catch (error: any) {
      const errorMessage = `Erro crítico ao buscar seu perfil: ${error.message}`;
      console.error(`[AuthContext] ❌ fetchUserProfile: ${errorMessage}`);
      setProfileError(errorMessage);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      console.log('[AuthContext] 🔄 refreshUserProfile: Atualizando perfil do usuário...');
      const profile = await fetchUserProfile(user);
      setUserProfile(profile);
    } else {
      console.log('[AuthContext] 🔄 refreshUserProfile: Nenhum usuário logado para atualizar.');
    }
  };

  useEffect(() => {
    console.log('[AuthContext] 🚀 useEffect: Montando o AuthProvider.');
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] 🔄 onAuthStateChange: Evento '${event}'`, { session });
        
        const authUser = session?.user || null;
        setUser(authUser);

        if (authUser) {
          // Se o usuário já tem perfil, não busca de novo, a menos que seja um login
          if (event === 'SIGNED_IN' || !userProfile) {
            console.log('[AuthContext] 🔄 onAuthStateChange: Buscando perfil após SIGNED_IN ou perfil vazio.');
            const profile = await fetchUserProfile(authUser);
            setUserProfile(profile);
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Verifica a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[AuthContext] 🚀 getSession: Verificando sessão inicial.', { session });
        if (!session) {
            setLoading(false);
        }
        // O onAuthStateChange já vai ser chamado se houver uma sessão, então não precisa fazer nada aqui.
    });


    return () => {
      console.log('[AuthContext] 🧹 useEffect: Desmontando o AuthProvider. Cancelando inscrição.');
      subscription.unsubscribe();
    };
  }, []); // O array de dependências vazio garante que isso rode apenas uma vez.

  async function signIn(email: string, password: string) {
    console.log(`[AuthContext] 🔐 signIn: Tentando login para ${email}`);
    setLoading(true);
    setProfileError(null);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        console.error('[AuthContext] ❌ signIn: Erro no login:', result.error.message);
        setProfileError(`Falha no login: ${result.error.message}`);
      } else {
        console.log('[AuthContext] ✅ signIn: Login bem-sucedido.');
        // O onAuthStateChange vai cuidar de buscar o perfil.
      }
      return result;
    } catch (error: any) {
      console.error('[AuthContext] ❌ signIn: Exceção no login:', error.message);
      setProfileError(`Ocorreu um erro inesperado: ${error.message}`);
      throw error;
    } finally {
      // O loading será setado para false pelo onAuthStateChange
    }
  }

  async function signUp(email: string, password: string) {
    // ... (manter implementação original)
    setLoading(true);
    try {
      const result = await supabase.auth.signUp({ email, password });
      return result;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    console.log('[AuthContext] 🚪 signOut: Fazendo logout...');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] ❌ signOut: Erro ao fazer logout:', error.message);
      } else {
        setUser(null);
        setUserProfile(null);
        setProfileError(null);
      }
    } catch (error: any) {
        console.error('[AuthContext] ❌ signOut: Exceção ao fazer logout:', error.message);
    }
    finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    profileError, // Expor o erro no contexto
    signIn,
    signUp,
    signOut,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

