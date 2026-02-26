// Sistema de autenticação mockado para MVP
import { useSession, signIn, signOut } from 'next-auth/react';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
}

// Usuários mockados
const users: User[] = [
  {
    id: '1',
    nome: 'Administrador',
    email: 'admin@clickse.com',
    role: 'admin',
    avatar: '/avatars/admin.jpg'
  },
  {
    id: '2',
    nome: 'Usuário Teste',
    email: 'user@clickse.com',
    role: 'user',
    avatar: '/avatars/user.jpg'
  }
];

// Simula um banco de dados de sessões
let currentUser: User | null = null;

export const login = async (email: string, senha: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Validação mockada - qualquer senha funciona para os usuários existentes
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return { success: false, error: 'Usuário não encontrado' };
  }
  
  // Simula validação de senha (aceita qualquer senha para MVP)
  if (senha.length < 3) {
    return { success: false, error: 'Senha deve ter pelo menos 3 caracteres' };
  }
  
  currentUser = user;
  
  // Simula armazenamento no localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('clickse_user', JSON.stringify(user));
  }
  
  return { success: true, user };
};

export const logout = (): void => {
  currentUser = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clickse_user');
  }
};

export const getCurrentUser = (): User | null => {
  // Tenta recuperar do estado atual
  if (currentUser) {
    return currentUser;
  }
  
  // Tenta recuperar do localStorage (para persistência entre recarregamentos)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('clickse_user');
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
        return currentUser;
      } catch (error) {
        localStorage.removeItem('clickse_user');
      }
    }
  }
  
  return null;
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

export const hasRole = (role: 'admin' | 'user'): boolean => {
  const user = getCurrentUser();
  return user?.role === role;
};

export const isAdmin = (): boolean => {
  return hasRole('admin');
};

// Middleware para proteger rotas
export const requireAuth = (callback?: (user: User) => boolean) => {
  const user = getCurrentUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  if (callback && !callback(user)) {
    throw new Error('Usuário não tem permissão para acessar este recurso');
  }
  
  return user;
};

// Hook para usar em componentes React
export const useAuth = () => {
  const { data: session, status } = useSession();
  
  const user: User | null = session ? {
    id: session.user.id,
    nome: session.user.name || '',
    email: session.user.email || '',
    role: (session.user.role as 'admin' | 'user') || 'user',
    avatar: undefined
  } : null;
  
  const loginUser = async (email: string, senha: string) => {
    const result = await signIn('credentials', {
      email,
      password: senha,
      redirect: false
    });
    
    return {
      success: !result?.error,
      user: result?.error ? null : user,
      error: result?.error || null
    };
  };
  
  const logoutUser = () => {
    signOut();
  };
  
  return {
    user,
    loading: status === 'loading',
    login: loginUser,
    logout: logoutUser,
    isAuthenticated: !!session,
    isAdmin: user?.role === 'admin'
  };
};

