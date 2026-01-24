import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
    allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(currentUser.role)) {
        // User asked to "throw 404", effectively meaning the page shouldn't exist for them.
        return <Navigate to="/404" replace />;
    }

    return <Outlet />;
}
