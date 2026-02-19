import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import MainLayout from "./components/MainLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Staff from "./pages/Staff";
import RequisitionsReport from "./pages/RequisitionsReport";
import DeploymentsReport from "./pages/DeploymentsReport";
import StockReport from "./pages/StockReport";
import StockTransactionReport from "./pages/StockTransactionReport";
import NewRequest from "./pages/NewRequest";
import Insights from "./pages/Insights";
import InventoryItems from "./pages/InventoryItems";
import Merchants from "./pages/Merchants";
import Suppliers from "./pages/Suppliers";
import StockJournal from "./pages/StockJournal";

import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Application Routes */}
            <Route element={<MainLayout />}>
              {/* Common Routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "manager", "sales"]} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/history" element={<History />} />
              </Route>

              {/* Sales Only */}
              <Route element={<ProtectedRoute allowedRoles={["sales"]} />}>
                <Route path="/new-request" element={<NewRequest />} />
              </Route>

              {/* Admin & Manager Only */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "manager"]} />}>
                <Route path="/staff" element={<Staff />} />
                <Route path="/reports/requisitions" element={<RequisitionsReport />} />
                <Route path="/reports/deployments" element={<DeploymentsReport />} />
                <Route path="/reports/stock" element={<StockReport />} />
                <Route path="/reports/transactions" element={<StockTransactionReport />} />
                <Route path="/inventory-items" element={<InventoryItems />} />
                <Route path="/merchants" element={<Merchants />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/stock-journal" element={<StockJournal />} />
              </Route>

              {/* Admin Only */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/insights" element={<Insights />} />
              </Route>
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
