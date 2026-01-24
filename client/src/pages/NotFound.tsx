import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
            <h1 className="text-6xl font-black text-indigo-200 mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Or you simply don't have permission to see it.
            </p>
            <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
                Back to Dashboard
            </button>
        </div>
    );
}
