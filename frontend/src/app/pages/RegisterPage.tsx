import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Zap, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../firebase-config";
import api from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Create the Firebase user
      const fullName = `${firstName} ${lastName}`.trim();
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Attach display name to the Firebase user
      await updateProfile(cred.user, { displayName: fullName });

      // 3. Force token refresh so the backend receives the updated name
      await cred.user.getIdToken(true);

      // 4. Sync with backend — create MongoDB user + business
      await api.post("/api/auth/sync", {
        businessName: businessName || undefined,
      });

      // 5. Tell AuthContext to fetch the user now that we are done manually syncing
      await refreshProfile();

      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center mb-3">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>SmartPulse</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create your account</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-red-700 text-xs" style={{ fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-first-name" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>First name</label>
              <input
                id="reg-first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="reg-last-name" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Last name</label>
              <input
                id="reg-last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-business" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Business name</label>
            <input
              id="reg-business"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Retail Ltd."
              className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Email</label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@business.com"
              className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Password</label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white rounded-md text-sm transition-colors flex items-center justify-center gap-2"
            style={{ fontWeight: 500 }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-violet-600 hover:underline" style={{ fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
