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
              <Route path="/" element={<Dashboard />} />
              <Route path="/history" element={<History />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/new-request" element={<NewRequest />} />
              <Route path="/insights" element={<Insights />} />

              <Route path="/inventory-items" element={<InventoryItems />} />
              <Route path="/merchants" element={<Merchants />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
