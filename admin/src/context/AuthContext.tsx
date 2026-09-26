import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import axiosInstance from "../Api/axios";

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  userRole?: string; // New field for sub-user roles
  companyName: string;
  isSubUser?: boolean; // Is this a sub-user
  parentAdminId?: string; // Reference to parent admin
  permissions?: string[]; // Array of permission keys
}

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("admin_token");
    window.location.href = "/admin-portal/signin";
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("admin_token");
    if (storedToken) {
      axiosInstance
        .get("/auth/profile", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        .then((res) => {
          // Backend returns { success: true, data: user with permissions }
          const userData = res.data.data;
          console.log("👤 User fetched from /auth/profile:", userData);

          // Show user type and role
          if (userData.isSubUser) {
            console.log(`🔑 Sub-user detected: userRole="${userData.userRole}", parentAdminId="${userData.parentAdminId}"`);
          }
          console.log(`🔐 User permissions (${userData.permissions?.length}):`, userData.permissions);

          setUser(userData);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = (user: User, token: string) => {
    console.log("✅ Login successful for user:", user.name);
    if (user.isSubUser) {
      console.log(`🔑 Sub-user detected: userRole="${user.userRole}", parentAdminId="${user.parentAdminId}"`);
    }
    console.log(`🔐 User permissions (${user.permissions?.length}):`, user.permissions);
    setUser(user);
    localStorage.setItem("admin_token", token);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};