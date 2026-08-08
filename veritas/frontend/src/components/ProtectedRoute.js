import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";
import { getSafeReturnPath } from "../navigation/agentRoutes";
export default function ProtectedRoute({
  children,
  requiredRole
}) {
  const {
    user,
    userRole,
    loading
  } = useAuthContext();
  const location = useLocation();
  if (loading) {
    return <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh"
    }}>
        <div style={{
        width: 28,
        height: 28,
        border: "3px solid #dde3ed",
        borderTopColor: "#2b5fab",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite"
      }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{
      from: getSafeReturnPath(location.pathname, location.search)
    }} />;
  }
  if (requiredRole === "client" && userRole !== "client") {
    return <Navigate to="/" replace />;
  }
  if (!requiredRole && userRole === "client") {
    return <Navigate to="/client" replace />;
  }
  return children;
}
