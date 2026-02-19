import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { MOCK_AUTH_CREDENTIALS, MOCK_USERS, type Role, type User } from "@/data/mockData";

const SESSION_KEY = "triage.auth.user";
const MOCK_REGISTERED_USERS_KEY = "triage.mock.registered.users";

export type AuthUser = Pick<User, "id" | "name" | "email" | "role" | "department">;

interface RegisteredUserRecord {
  user: AuthUser;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  register: (input: RegisterInput) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
});

const getStoredSession = (): AuthUser | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const getRegisteredUsers = (): RegisteredUserRecord[] => {
  const raw = localStorage.getItem(MOCK_REGISTERED_USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RegisteredUserRecord[];
  } catch {
    return [];
  }
};

const setRegisteredUsers = (users: RegisteredUserRecord[]) => {
  localStorage.setItem(MOCK_REGISTERED_USERS_KEY, JSON.stringify(users));
};

const getDefaultUsers = (): RegisteredUserRecord[] =>
  MOCK_AUTH_CREDENTIALS.map((credential) => {
    const user = MOCK_USERS.find((u) => u.id === credential.userId);
    if (!user) {
      return null;
    }
    return {
      user: toAuthUser(user),
      password: credential.password,
    };
  }).filter((record): record is RegisteredUserRecord => record !== null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredSession());

  const login = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const records = [...getDefaultUsers(), ...getRegisteredUsers()];
    const match = records.find((r) => r.user.email.toLowerCase() === normalizedEmail);

    if (!match || match.password !== password) {
      return { ok: false, error: "Invalid email or password." };
    }

    setUser(match.user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(match.user));
    return { ok: true };
  };

  const register = ({ name, email, password, role, department }: RegisterInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = [...getDefaultUsers(), ...getRegisteredUsers()].some(
      (record) => record.user.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const newUser: AuthUser = {
      id: `u-mock-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      role,
      department: department.trim(),
    };
    const stored = getRegisteredUsers();
    setRegisteredUsers([...stored, { user: newUser, password }]);
    setUser(newUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
