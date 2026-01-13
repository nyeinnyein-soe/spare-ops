import { ClipboardList, Store, CheckCircle } from "lucide-react";
import StatCard from "./StatCard";
import { RequestRecord, UsageRecord, RequestStatus } from "../types";
import { db } from "../services/dbService";

export default function AdminDashboardView({
  requests,
  usages,
  userRole,
  onRefresh,
}: any) {
  const pending = requests.filter(
    (r: RequestRecord) => r.status === RequestStatus.PENDING,
  );
  const recentUsages = usages.slice(0, 10);

  const handleUpdate = async (id: string, status: RequestStatus) => {
    await db.requests.updateStatus(id, status);
    onRefresh(); // Trigger Data Context refresh
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Pending Action"
          value={pending.length.toString()}
          icon={<ClipboardList className="text-amber-500" />}
        />
        <StatCard
          label="Live Utilization"
          value={usages.length.toString()}
          icon={<Store className="text-indigo-500" />}
        />
        <StatCard
          label="Stock Distributed"
          value={requests
            .filter((r: any) => r.status === RequestStatus.RECEIVED)
            .length.toString()}
          icon={<CheckCircle className="text-emerald-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Requests */}
        <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800">
              {userRole === "manager"
                ? "Awaiting Distribution"
                : "Requests for Approval"}
            </h2>
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {pending.length} New
            </span>
          </div>
          <div className="divide-y overflow-auto max-h-[600px]">
            {pending.length === 0 ? (
              <div className="p-20 text-center">
                <CheckCircle
                  size={48}
                  className="mx-auto text-slate-200 mb-4"
                />
                <div className="text-slate-400 font-medium italic">
                  All pending requests cleared.
                </div>
              </div>
            ) : (
              pending.map((r: RequestRecord) => (
                <div
                  key={r.id}
                  className="p-8 flex flex-col sm:flex-row justify-between items-center gap-8 group hover:bg-slate-50 transition-colors"
                >
                  <div className="flex gap-5 flex-1">
                    <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl border border-indigo-100 shadow-sm">
                      {r.requesterName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg mb-0.5">
                        {r.requesterName}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {r.items.map((i, idx) =>
                          i.quantity ? (
                            <span
                              key={idx}
                              className="text-[10px] font-black bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-700"
                            >
                              {i.quantity}x {i.type}
                            </span>
                          ) : (
                            ""
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => handleUpdate(r.id, RequestStatus.APPROVED)}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdate(r.id, RequestStatus.REJECTED)}
                      className="px-8 py-3 bg-white text-rose-600 border border-rose-100 rounded-xl text-xs font-black hover:bg-rose-50 active:scale-95"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b bg-slate-50/50">
            <h2 className="font-bold text-slate-800">
              Recent Shop Deployments
            </h2>
          </div>
          <div className="divide-y flex-1 overflow-auto max-h-[600px]">
            {recentUsages.map((u: UsageRecord) => (
              <div
                key={u.id}
                className="p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-900">
                    {u.shopName}
                  </span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {u.partType}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">
                  Deployed: {new Date(u.usedAt).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="font-black text-[8px] uppercase text-slate-400 block mb-0.5 tracking-tighter">
                    By Staff Member
                  </span>{" "}
                  {u.salespersonName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
