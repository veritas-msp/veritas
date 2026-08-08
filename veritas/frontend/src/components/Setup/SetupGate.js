import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSetupStatus } from "../../api/setup";
export default function SetupGate({
  children
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const hasBeenReadyRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const status = await getSetupStatus();
        if (cancelled) return;
        const onSetup = location.pathname === "/setup";
        if (status.needsSetup && !onSetup) {
          navigate("/setup", {
            replace: true
          });
          return;
        }
        if (!status.needsSetup && onSetup) {
          navigate("/login", {
            replace: true
          });
          return;
        }
      } catch {
        if (!cancelled && location.pathname !== "/setup") {
          navigate("/setup", {
            replace: true
          });
          return;
        }
      }
      if (!cancelled) {
        setReady(true);
        hasBeenReadyRef.current = true;
      }
    };
    if (!hasBeenReadyRef.current) {
      setReady(false);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);
  if (!ready) {
    return <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      gap: "0.75rem",
      color: "#64748b"
    }}>
        <div style={{
        width: 28,
        height: 28,
        border: "3px solid #dde3ed",
        borderTopColor: "#2b5fab",
        borderRadius: "50%",
        animation: "setupGateSpin 0.7s linear infinite"
      }} />
        <p style={{
        margin: 0,
        fontSize: "0.95rem"
      }}>Checking installation…</p>
        <style>{`@keyframes setupGateSpin { to { transform: rotate(360deg); } }`}</style>
      </div>;
  }
  return children;
}
