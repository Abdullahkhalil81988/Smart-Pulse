import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Zap, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../../firebase-config";
import api from "../lib/api";

export function RegisterPage() {
  const navigate = useNavigate();
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
      // Flag to prevent AuthContext's onAuthStateChanged from auto-syncing
      // before we've finished setting up the profile.
      (auth as any)._skipAutoSync = true;

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

      // 5. Allow future auto-syncs again
      (auth as any)._skipAutoSync = false;

      navigate("/dashboard");
    } catch (err: unknown) {
      (auth as any)._skipAutoSync = false;
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // The AuthContext's onAuthStateChanged will sync automatically
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-up failed";
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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-9 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-60 rounded-md text-sm text-gray-700 flex items-center justify-center gap-2 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
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
