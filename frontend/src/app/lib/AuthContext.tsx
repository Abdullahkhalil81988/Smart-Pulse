import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../../firebase-config";
import api from "../lib/api";

/* ─── types ──────────────────────────────────────────────── */

interface MongoUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  business: { _id: string; name: string; industry: string } | null;
}

interface AuthState {
  firebaseUser: User | null;
  user: MongoUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  /** Re-fetch the MongoDB user profile (e.g. after linking a business). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  user: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

/* ─── provider ───────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync with the backend whenever the Firebase user changes
  async function syncUser(fbUser: User) {
    try {
      const { user: mongoUser } = await api.post<{ user: MongoUser }>(
        "/api/auth/sync"
      );
      setUser(mongoUser);
    } catch (err) {
      console.error("Failed to sync user with backend:", err);
    }
  }

  async function refreshProfile() {
    if (!firebaseUser) return;
    await syncUser(firebaseUser);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await syncUser(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── hook ───────────────────────────────────────────────── */

export function useAuth() {
  return useContext(AuthContext);
}
