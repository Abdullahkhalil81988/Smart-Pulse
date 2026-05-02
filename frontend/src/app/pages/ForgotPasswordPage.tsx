import { Link } from "react-router";
import { Zap, ArrowLeft } from "lucide-react";

export function ForgotPasswordPage() {
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Email address</label>
            <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center">
              <span className="text-gray-400 text-sm">jane@business.com</span>
            </div>
          </div>

          <button className="w-full h-9 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-sm transition-colors" style={{ fontWeight: 500 }}>
            Send reset link
          </button>

          {/* Success state preview */}
          <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2.5">
            <p className="text-emerald-700 text-xs" style={{ fontWeight: 500 }}>✓ Check your inbox</p>
            <p className="text-emerald-600 text-xs mt-0.5">Reset link sent to jane@business.com</p>
          </div>
        </div>

        <Link to="/login" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={13} />
          Back to login
        </Link>

        <div className="mt-6 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Auth — Forgot password</p>
          <p className="text-xs text-gray-400 mt-0.5">States: form → success confirmation</p>
        </div>
      </div>
    </div>
  );
}
