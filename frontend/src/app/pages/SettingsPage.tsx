import { useEffect, useState } from "react";
import { Settings, Users, Sliders, Building2, Zap, Plus, Trash2, Loader2 } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";
import api from "../lib/api";
import { toast } from "sonner";

interface BusinessProfile {
  _id: string;
  name: string;
  industry: string;
}

const staffMembers = [
  { name: "Jane Doe", email: "jane@business.com", role: "Admin", status: "Active" },
  { name: "Mark Torres", email: "mark@business.com", role: "Manager", status: "Active" },
  { name: "Priya Nair", email: "priya@business.com", role: "Cashier", status: "Active" },
  { name: "Sam Lee", email: "sam@business.com", role: "Analyst", status: "Invited" },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"business" | "model" | "staff">("business");
  const [fraudThreshold, setFraudThreshold] = useState(75);
  const [reviewThreshold, setReviewThreshold] = useState(40);
  const [churnThreshold, setChurnThreshold] = useState(75);

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    async function fetchBusiness() {
      try {
        const res = await api.get<BusinessProfile[]>("/api/businesses");
        if (res.length > 0) {
          setBusiness(res[0]);
        }
      } catch (err) {
        console.error("Failed to fetch business profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBusiness();
  }, []);

  const tabs = [
    { key: "business", label: "Business profile", icon: Building2 },
    { key: "model", label: "Model config", icon: Sliders },
    { key: "staff", label: "Staff & users", icon: Users },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-4xl w-full">
      {/* Header */}
      <div>
        <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Settings</h2>
        <p className="text-gray-500 text-xs md:text-sm mt-0.5">Config + users — back office only</p>
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Sidebar tabs */}
        <div className="w-full md:w-44 flex-shrink-0">
          <nav className="flex md:flex-col gap-0.5 md:space-y-0.5 overflow-x-auto md:overflow-x-visible">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left whitespace-nowrap transition-colors ${activeTab === tab.key ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
                style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
              >
                <tab.icon size={14} className={activeTab === tab.key ? "text-gray-700" : "text-gray-400"} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "business" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Business information</p>
                <div className="space-y-4">
                  {/* Logo */}
                  <div className="flex items-center gap-4">
                    <WireframeBox label="Logo" height={64} className="w-16" />
                    <div>
                      <p className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>Business logo</p>
                      <p className="text-gray-400 text-xs mt-0.5">PNG, JPG, SVG · max 2MB</p>
                      <div className="flex gap-2 mt-2">
                        <button className="px-2.5 py-1 rounded border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">Upload</button>
                        <button className="px-2.5 py-1 rounded border border-gray-200 text-xs text-gray-400">Remove</button>
                      </div>
                    </div>
                  </div>
                  {/* Fields */}
                  {[
                    { label: "Business name", value: business?.name || "N/A" },
                    { label: "Industry", value: business?.industry || "N/A" },
                    { label: "Business ID", value: business?._id || "N/A" },
                  ].map((f) => (
                    <div key={f.label} className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 md:items-center">
                      <label className="text-gray-600 text-xs" style={{ fontWeight: 500 }}>{f.label}</label>
                      <div className="md:col-span-2 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center">
                        <span className="text-gray-700 text-sm">{f.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dev tools (local only) */}
              {import.meta.env.DEV && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Dev tools</p>
                      <p className="text-gray-400 text-xs mt-0.5">Seed MongoDB with demo inventory + transactions for your user.</p>
                    </div>
                    <button
                      disabled={seeding}
                      onClick={async () => {
                        try {
                          setSeeding(true);
                          await api.post("/api/dev/seed", { wipe: true, inventoryItems: 28, transactions: 80, daysBack: 45 });
                          toast.success("Seeded demo data. Refreshing…");
                          window.location.reload();
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : "Failed to seed demo data";
                          toast.error(msg);
                        } finally {
                          setSeeding(false);
                        }
                      }}
                      className="h-9 px-4 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ fontWeight: 600 }}
                    >
                      {seeding ? "Seeding…" : "Seed demo data"}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Location & contact</p>
                <div className="space-y-4">
                  {/* Address */}
                  <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 md:items-center">
                    <label className="text-gray-600 text-xs" style={{ fontWeight: 500 }}>Address</label>
                    <div className="md:col-span-2 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center">
                      <span className="text-gray-700 text-sm">123 Main St, Suite 4</span>
                    </div>
                  </div>

                  {/* City / State / ZIP - Split into 3 fields */}
                  <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 md:items-start">
                    <label className="text-gray-600 text-xs md:pt-2" style={{ fontWeight: 500 }}>City / State / ZIP</label>
                    <div className="md:col-span-2 flex flex-col md:flex-row gap-2">
                      {/* Mobile: City full width, then State/ZIP 50/50 */}
                      {/* Desktop: All in one row */}
                      <input
                        type="text"
                        defaultValue="San Francisco"
                        className="w-full md:flex-1 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 text-gray-700 text-sm"
                        placeholder="City"
                      />
                      <div className="flex gap-2">
                        <select className="flex-1 md:w-24 h-9 rounded-md border border-gray-200 bg-gray-50 px-2 text-gray-700 text-sm">
                          <option>CA</option>
                          <option>NY</option>
                          <option>TX</option>
                          <option>FL</option>
                        </select>
                        <input
                          type="text"
                          defaultValue="94103"
                          className="flex-1 md:w-24 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 text-gray-700 text-sm"
                          placeholder="ZIP"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 md:items-center">
                    <label className="text-gray-600 text-xs" style={{ fontWeight: 500 }}>Phone</label>
                    <div className="md:col-span-2 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center">
                      <span className="text-gray-700 text-sm">+1 (415) 555-0182</span>
                    </div>
                  </div>

                  {/* Support email */}
                  <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 md:items-center">
                    <label className="text-gray-600 text-xs" style={{ fontWeight: 500 }}>Support email</label>
                    <div className="md:col-span-2 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center">
                      <span className="text-gray-700 text-sm">support@acmeretail.com</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone Card */}
              <div className="bg-white rounded-lg border border-red-200 p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-red-600 text-sm mb-2" style={{ fontWeight: 600 }}>Danger Zone</p>
                    <p className="text-gray-600 text-sm">
                      Permanently delete this business profile and wipe all associated POS and ML data.
                    </p>
                  </div>
                  <button className="w-full md:w-auto px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 md:ml-6 md:flex-shrink-0" style={{ fontWeight: 500 }}>
                    Delete Business
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
                <button className="w-full md:w-auto px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button className="w-full md:w-auto px-4 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-700" style={{ fontWeight: 500 }}>Save changes</button>
              </div>
            </div>
          )}

          {activeTab === "model" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Fraud detection thresholds</p>
                    <p className="text-gray-400 text-xs mt-0.5">Scores range 0 – 100. Higher = more suspicious.</p>
                  </div>
                  <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                    Model v2.4
                  </span>
                </div>

                {/* Threshold sliders */}
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>FRAUD threshold</p>
                        <p className="text-gray-400 text-xs">Transactions ≥ this score auto-flagged as fraud</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-8 rounded-md border border-red-300 bg-red-50 flex items-center justify-center">
                          <span className="text-red-700 text-sm" style={{ fontWeight: 700 }}>{fraudThreshold}</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full">
                      <div className="absolute left-0 top-0 h-2 bg-red-400 rounded-full" style={{ width: `${fraudThreshold}%` }} />
                      <input
                        type="range" min={0} max={100} value={fraudThreshold}
                        onChange={(e) => setFraudThreshold(+e.target.value)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0</span><span>100</span></div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>REVIEW threshold</p>
                        <p className="text-gray-400 text-xs">Scores between this and fraud threshold → manual review</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-8 rounded-md border border-amber-300 bg-amber-50 flex items-center justify-center">
                          <span className="text-amber-700 text-sm" style={{ fontWeight: 700 }}>{reviewThreshold}</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full">
                      <div className="absolute left-0 top-0 h-2 bg-amber-400 rounded-full" style={{ width: `${reviewThreshold}%` }} />
                      <input
                        type="range" min={0} max={fraudThreshold - 1} value={reviewThreshold}
                        onChange={(e) => setReviewThreshold(+e.target.value)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                      />
                    </div>
                  </div>

                  {/* Score zone preview */}
                  <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                    <p className="text-gray-500 text-xs mb-2" style={{ fontWeight: 500 }}>Score zone preview</p>
                    <div className="flex h-5 rounded-full overflow-hidden">
                      <div className="bg-emerald-300" style={{ width: `${reviewThreshold}%` }} title={`Safe: 0–${reviewThreshold - 1}`} />
                      <div className="bg-amber-300" style={{ width: `${fraudThreshold - reviewThreshold}%` }} title={`Review: ${reviewThreshold}–${fraudThreshold - 1}`} />
                      <div className="bg-red-400" style={{ width: `${100 - fraudThreshold}%` }} title={`Fraud: ${fraudThreshold}–100`} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span className="text-emerald-600">SAFE (0–{reviewThreshold - 1})</span>
                      <span className="text-amber-600">REVIEW ({reviewThreshold}–{fraudThreshold - 1})</span>
                      <span className="text-red-600">FRAUD ({fraudThreshold}–100)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Churn Prediction Thresholds */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Churn prediction thresholds</p>
                    <p className="text-gray-400 text-xs mt-0.5">Define risk levels for customer retention campaigns.</p>
                  </div>
                  <span className="text-xs text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                    Model v1.1
                  </span>
                </div>

                {/* Threshold slider */}
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>AT-RISK threshold</p>
                        <p className="text-gray-400 text-xs">Customers ≥ this score are flagged for retention outreach</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-8 rounded-md border border-red-300 bg-red-50 flex items-center justify-center">
                          <span className="text-red-700 text-sm" style={{ fontWeight: 700 }}>{churnThreshold}</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full">
                      <div className="absolute left-0 top-0 h-2 bg-red-400 rounded-full" style={{ width: `${churnThreshold}%` }} />
                      <input
                        type="range" min={0} max={100} value={churnThreshold}
                        onChange={(e) => setChurnThreshold(+e.target.value)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>0</span><span>100</span></div>
                  </div>

                  {/* Score zone preview */}
                  <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                    <p className="text-gray-500 text-xs mb-2" style={{ fontWeight: 500 }}>Score zone preview</p>
                    <div className="flex h-5 rounded-full overflow-hidden">
                      <div className="bg-emerald-300" style={{ width: "50%" }} title="Safe: 0–49" />
                      <div className="bg-amber-300" style={{ width: "25%" }} title="Monitor: 50–74" />
                      <div className="bg-red-400" style={{ width: "25%" }} title="At-Risk: 75–100" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span className="text-emerald-600">SAFE (0–49)</span>
                      <span className="text-amber-600">MONITOR (50–74)</span>
                      <span className="text-red-600">AT-RISK (75–100)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-column grid for Model Explainability and Custom Override Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Model Explainability */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Top Risk Factors (Read-Only)</p>
                  <p className="text-gray-400 text-xs mt-0.5 mb-4">Features currently driving the AI predictions.</p>

                  <div className="space-y-3">
                    {/* Feature 1: IP/Location Mismatch */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>IP/Location Mismatch</span>
                        <span className="text-gray-600 text-xs" style={{ fontWeight: 600 }}>42%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-violet-500 rounded-full" style={{ width: "42%" }} />
                      </div>
                    </div>

                    {/* Feature 2: Transaction Velocity */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>Transaction Velocity</span>
                        <span className="text-gray-600 text-xs" style={{ fontWeight: 600 }}>31%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-violet-500 rounded-full" style={{ width: "31%" }} />
                      </div>
                    </div>

                    {/* Feature 3: Unusual Time of Day */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>Unusual Time of Day</span>
                        <span className="text-gray-600 text-xs" style={{ fontWeight: 600 }}>18%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-violet-500 rounded-full" style={{ width: "18%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Custom Override Rules */}
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Hardcoded Overrides</p>
                  <p className="text-gray-400 text-xs mt-0.5 mb-4">Rules that bypass the ML score.</p>

                  <div className="space-y-4">
                    {/* Rule 1: Block transactions > $5,000 */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>
                          ALWAYS block transactions &gt; $5,000
                        </p>
                      </div>
                      <div className="w-10 h-5 rounded-full bg-gray-900 flex items-center px-0.5 justify-end ml-4">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>

                    {/* Rule 2: Allow transactions with matching physical chip */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>
                          ALWAYS allow transactions with matching physical chip
                        </p>
                      </div>
                      <div className="w-10 h-5 rounded-full bg-gray-900 flex items-center px-0.5 justify-end ml-4">
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>Notification rules</p>
                <div className="space-y-3">
                  {[
                    { label: "Alert on FRAUD verdict", enabled: true },
                    { label: "Daily digest email", enabled: true },
                    { label: "Slack webhook on HIGH risk", enabled: false },
                  ].map((rule) => (
                    <div key={rule.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700 text-sm">{rule.label}</span>
                      <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${rule.enabled ? "bg-gray-900 justify-end" : "bg-gray-200 justify-start"}`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Reset defaults</button>
                <button className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-700" style={{ fontWeight: 500 }}>Save config</button>
              </div>
            </div>
          )}

          {activeTab === "staff" && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-gray-900 text-xs md:text-sm" style={{ fontWeight: 600 }}>Team members</p>
                  <button className="h-8 px-3 rounded-md bg-gray-900 text-white flex items-center gap-1.5 text-xs hover:bg-gray-700 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    <Plus size={12} /> <span className="hidden sm:inline">Invite member</span><span className="sm:hidden">Invite</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Member", "Email", "Role", "Status", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.map((m, index) => (
                      <tr key={m.email} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600" style={{ fontSize: 10, fontWeight: 700 }}>
                                {m.name.split(" ").map((n) => n[0]).join("")}
                              </span>
                            </div>
                            <span className="text-gray-800" style={{ fontWeight: 500 }}>{m.name}</span>
                            {index === 0 && (
                              <span className="text-gray-400 text-xs">(You)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{m.email}</td>
                        <td className="px-4 py-3">
                          {index === 0 ? (
                            <span className="text-gray-700 text-sm">{m.role}</span>
                          ) : (
                            <div className="h-6 px-2 rounded border border-gray-200 bg-gray-50 flex items-center text-gray-600 w-fit">
                              {m.role} ▾
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full ${m.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} style={{ fontWeight: 600 }}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {index !== 0 && (
                            <Trash2 size={13} className="text-gray-300 hover:text-red-400 cursor-pointer" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-gray-900 text-xs md:text-sm" style={{ fontWeight: 600 }}>Role permissions</p>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Feature</th>
                      <th className="text-center px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Admin</th>
                      <th className="text-center px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Manager</th>
                      <th className="text-center px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Analyst</th>
                      <th className="text-center px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Cashier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Access POS & Checkout */}
                    <tr className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-700">Access POS & Checkout</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                    </tr>

                    {/* Row 2: Process Refunds */}
                    <tr className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-700">Process Refunds</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                    </tr>

                    {/* Row 3: View Analytics & Sales */}
                    <tr className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-700">View Analytics & Sales</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                    </tr>

                    {/* Row 4: Configure AI Models */}
                    <tr className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-700">Configure AI Models</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600" style={{ fontWeight: 600 }}>✓</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotation */}
      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-gray-400" />
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Settings — Config + users (back office only)</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Tabs: Business profile (name, location) · Model config (thresholds, features) · Staff & users (roles, permissions)</p>
      </div>
    </div>
  );
}
