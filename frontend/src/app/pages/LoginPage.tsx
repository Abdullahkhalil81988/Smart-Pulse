import { Link, useNavigate } from "react-router";
import { Zap } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Email</label>
              <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center">
                <span className="text-gray-400 text-sm">jane@business.com</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-700" style={{ fontWeight: 500 }}>Password</label>
                <Link to="/forgot-password" className="text-xs text-violet-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center gap-2">
                <span className="flex gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                  ))}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full h-9 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
              style={{ fontWeight: 500 }}
            >
              Sign in
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button className="mt-3 w-full h-9 bg-white border border-gray-300 hover:bg-gray-50 rounded-md text-sm text-gray-700 flex items-center justify-center gap-2 transition-colors">
            <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500" style={{ fontSize: 9, fontWeight: 700 }}>G</span>
            </div>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-violet-600 hover:underline" style={{ fontWeight: 500 }}>Sign up</Link>
        </p>

        {/* Wireframe annotation */}
        <div className="mt-6 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Auth — Login</p>
          <p className="text-xs text-gray-400 mt-0.5">Routes: /login → /register → /forgot-password</p>
        </div>
      </div>
    </div>
  );
}
