import { Link, useNavigate } from "react-router";
import { Zap } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>First name</label>
              <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center">
                <span className="text-gray-400 text-sm">Jane</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Last name</label>
              <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center">
                <span className="text-gray-400 text-sm">Doe</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Business name</label>
            <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center">
              <span className="text-gray-400 text-sm">Acme Retail Ltd.</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Email</label>
            <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center">
              <span className="text-gray-400 text-sm">jane@business.com</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1" style={{ fontWeight: 500 }}>Password</label>
            <div className="h-9 rounded-md border border-gray-300 bg-gray-50 px-3 flex items-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full h-9 bg-gray-900 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
            style={{ fontWeight: 500 }}
          >
            Create account
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-violet-600 hover:underline" style={{ fontWeight: 500 }}>Sign in</Link>
        </p>

        <div className="mt-6 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Auth — Register</p>
          <p className="text-xs text-gray-400 mt-0.5">Fields: name, business, email, password</p>
        </div>
      </div>
    </div>
  );
}
