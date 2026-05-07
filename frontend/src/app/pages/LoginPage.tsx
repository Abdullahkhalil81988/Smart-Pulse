import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Zap, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase-config";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center mb-3">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>SmartPulse</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-red-700 text-xs" style={{ fontWeight: 500 }}>{error}</p>
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@business.com"
                className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm text-gray-700" style={{ fontWeight: 500 }}>Password</label>
                <Link to="/forgot-password" className="text-xs text-violet-600 hover:underline">Forgot password?</Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
              Sign in
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-violet-600 hover:underline" style={{ fontWeight: 500 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
