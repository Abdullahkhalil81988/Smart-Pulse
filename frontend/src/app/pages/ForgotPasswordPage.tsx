import { useState } from "react";
import { Link } from "react-router";
import { Zap, ArrowLeft, Loader2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase-config";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
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
          <h1 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>Reset password</h1>
          <p className="text-gray-500 text-sm mt-0.5 text-center">We'll send a reset link to your email</p>
        </div>

        <form onSubmit={handleReset} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-red-700 text-xs" style={{ fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="reset-email" className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Email address</label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@business.com"
              className="w-full h-9 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || sent}
            className="w-full h-9 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white rounded-md text-sm transition-colors flex items-center justify-center gap-2"
            style={{ fontWeight: 500 }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Send reset link
          </button>

          {sent && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2.5">
              <p className="text-emerald-700 text-xs" style={{ fontWeight: 500 }}>✓ Check your inbox</p>
              <p className="text-emerald-600 text-xs mt-0.5">Reset link sent to {email}</p>
            </div>
          )}
        </form>

        <Link to="/login" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={13} />
          Back to login
        </Link>
      </div>
    </div>
  );
}
