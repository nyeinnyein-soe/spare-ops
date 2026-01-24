import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import MainLayout from "./components/MainLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Staff from "./pages/Staff";
import Reports from "./pages/Reports";
import NewRequest from "./pages/NewRequest";
import Insights from "./pages/Insights";
import InventoryItems from "./pages/InventoryItems";
import Merchants from "./pages/Merchants";

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
                <Route path="/reports" element={<Reports />} />
                <Route path="/inventory-items" element={<InventoryItems />} />
                <Route path="/merchants" element={<Merchants />} />
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
