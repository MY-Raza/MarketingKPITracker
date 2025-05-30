import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiClient } from "../services/api";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "marketing_kpi_tokens";
const USER_STORAGE_KEY = "marketing_kpi_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const isAuthenticated = !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (storedUser && storedTokens) {
      try {
        const userData = JSON.parse(storedUser) as User;
        const tokens = JSON.parse(storedTokens) as AuthTokens;
        setUser(userData);
        apiClient.setTokens(tokens);
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        clearAuthData();
      }
    }
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    apiClient.clearTokens();
    setUser(null);
  };

  const saveAuthData = (user: User, tokens: AuthTokens) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    apiClient.setTokens(tokens);
    setUser(user);
  };

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/login', {
        email,
        password,
      }) as any;

      if (response && response.user && response.tokens) {
        saveAuthData(response.user, response.tokens);
        setLocation('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/register', data) as any;
      
      if (response && response.user && response.tokens) {
        saveAuthData(response.user, response.tokens);
        setLocation('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    clearAuthData();
    setLocation('/login');
  };

  const refreshToken = async (): Promise<void> => {
    // Simplified refresh - just keep current session for now
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        setLocation('/login');
      }
    }, [isAuthenticated, isLoading, setLocation]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}