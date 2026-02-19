import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Loader2 } from "lucide-react";
import AdminDashboardView from "../components/AdminDashboardView";
import SalesDashboardView from "../components/SalesDashboardView";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { requests, usages, loading, refreshData } = useData();

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  // Filter logic: Sales only sees their own stuff
  const myRequests =
    currentUser?.role === "sales"
      ? requests.filter((r) => r.requesterId === currentUser.id)
      : requests;

  const myUsages =
    currentUser?.role === "sales"
      ? usages.filter((u) => u.salespersonId === currentUser.id)
      : usages;

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      {currentUser?.role === "sales" ? (
        <SalesDashboardView
          requests={myRequests}
          usages={myUsages}
          onRefresh={refreshData}
        />
      ) : (
        <AdminDashboardView
          requests={requests}
          usages={usages}
          userRole={currentUser?.role}
          onRefresh={refreshData}
        />
      )}
    </div>
  );
}
