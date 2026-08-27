import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import './App.css';
import "./styles/common/toastifyOverrides.css";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { getMaintenanceStatus } from "./api/maintenance";
import MainApp from "./components/MainApp";
import ResetPassword from "./components/Authentication/ResetPassword";
import AuthPage from "./components/Authentication/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ClientDashboard from "./components/ClientPortal/ClientDashboard";
import ClientPortalLayout from "./components/ClientPortal/ClientPortalLayout";
import ClientTicketListPage from "./components/ClientPortal/ClientTicketListPage";
import ClientTicketDetailPage from "./components/ClientPortal/ClientTicketDetailPage";
import ClientProfilePage from "./components/ClientPortal/ClientProfilePage";
import ClientTicketCreatePage from "./components/ClientPortal/ClientTicketCreatePage";
import ClientVaultPage from "./components/ClientPortal/ClientVaultPage";
import ClientKnowledgeBasePage from "./components/ClientPortal/ClientKnowledgeBasePage";
import ClientKnowledgeArticlePage from "./components/ClientPortal/ClientKnowledgeArticlePage";
import ClientDevicesPage from "./components/ClientPortal/ClientDevicesPage";
import ClientServicesPage from "./components/ClientPortal/ClientServicesPage";
import ClientCybersecurityPage from "./components/ClientPortal/ClientCybersecurityPage";
import ClientContractPage from "./components/ClientPortal/ClientContractPage";
import SetupPage from "./components/Setup/SetupPage";
import SetupGate from "./components/Setup/SetupGate";
import { AppGeneralSettingsProvider } from "./hooks/useAppGeneralSettings";
import { useCommonCopy } from "./hooks/useCommonCopy";
import { getToastPosition, subscribeToastPosition } from "./utils/toastPosition";
function GlobalMaintenanceTicker({
  maintenanceStatus,
  isTickerHoverZone
}) {
  const copy = useCommonCopy();
  const maintenanceMessage = maintenanceStatus?.message?.trim() || copy.maintenanceDefault;
  const tickerDuration = Number.isFinite(Number(maintenanceStatus?.tickerSpeed)) ? Math.max(5, Math.min(60, Number(maintenanceStatus.tickerSpeed))) : 22;
  const tickerDirection = maintenanceStatus?.tickerDirection === "right" ? "right" : "left";
  const tickerColor = /^#([0-9a-fA-F]{6})$/.test(maintenanceStatus?.tickerColor || "") ? maintenanceStatus.tickerColor : "#d97706";
  const tickerText = `${copy.maintenancePrefix} - ${maintenanceMessage}`;
  return <div className={`globalMaintenanceTicker ${isTickerHoverZone ? "hoverTransparent" : ""}`} role="status" aria-live="polite" style={{
    "--maintenance-ticker-color": tickerColor
  }}>
      <div className={`globalMaintenanceTickerTrack ${tickerDirection === "right" ? "reverseDirection" : ""} ${isTickerHoverZone ? "paused" : ""}`} style={{
      animationDuration: `${tickerDuration}s`
    }}>
        <span>{tickerText}</span>
        <span>{tickerText}</span>
      </div>
    </div>;
}
export default function App() {
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    enabled: false,
    message: "",
    tickerSpeed: 22,
    tickerDirection: "left",
    tickerColor: "#d97706"
  });
  const [isTickerHoverZone, setIsTickerHoverZone] = useState(false);
  const [toastPosition, setToastPosition] = useState(getToastPosition);
  useEffect(() => {
    let mounted = true;
    const loadStatus = async () => {
      try {
        const status = await getMaintenanceStatus();
        if (!mounted) return;
        setMaintenanceStatus({
          enabled: Boolean(status?.enabled || status?.maintenanceMode),
          message: status?.message || "",
          tickerSpeed: Number.isFinite(Number(status?.tickerSpeed)) ? Number(status.tickerSpeed) : 22,
          tickerDirection: status?.tickerDirection === "right" ? "right" : "left",
          tickerColor: /^#([0-9a-fA-F]{6})$/.test(status?.tickerColor || "") ? status.tickerColor : "#d97706"
        });
      } catch {
        if (!mounted) return;
        setMaintenanceStatus(prev => ({
          ...prev,
          enabled: false
        }));
      }
    };
    loadStatus();
    const intervalId = setInterval(loadStatus, 15000);
    const handleMaintenanceStatusUpdated = event => {
      const payload = event?.detail || {};
      setMaintenanceStatus({
        enabled: Boolean(payload?.enabled),
        message: payload?.message || "",
        tickerSpeed: Number.isFinite(Number(payload?.tickerSpeed)) ? Number(payload.tickerSpeed) : 22,
        tickerDirection: payload?.tickerDirection === "right" ? "right" : "left",
        tickerColor: /^#([0-9a-fA-F]{6})$/.test(payload?.tickerColor || "") ? payload.tickerColor : "#d97706"
      });
    };
    window.addEventListener("maintenanceStatusUpdated", handleMaintenanceStatusUpdated);
    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener("maintenanceStatusUpdated", handleMaintenanceStatusUpdated);
    };
  }, []);
  useEffect(() => {
    const handleMouseMove = event => {
      setIsTickerHoverZone(event.clientY <= 34);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  useEffect(() => subscribeToastPosition(setToastPosition), []);
  return <ThemeProvider>
      <AppGeneralSettingsProvider>
      <AuthProvider>
        <PermissionsProvider>
        {maintenanceStatus?.enabled && <GlobalMaintenanceTicker maintenanceStatus={maintenanceStatus} isTickerHoverZone={isTickerHoverZone} />}
        <Router>
          <SetupGate>
            <Routes>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/client" element={<ProtectedRoute requiredRole="client">
                    <ClientPortalLayout />
                  </ProtectedRoute>}>
                <Route index element={<ClientDashboard />} />
                <Route path="tickets" element={<ClientTicketListPage />} />
                <Route path="tickets/new" element={<ClientTicketCreatePage />} />
                <Route path="tickets/:ticketId" element={<ClientTicketDetailPage />} />
                <Route path="devices" element={<ClientDevicesPage />} />
                <Route path="services" element={<ClientServicesPage />} />
                <Route path="cybersecurity" element={<ClientCybersecurityPage />} />
                <Route path="contract" element={<ClientContractPage />} />
                <Route path="knowledge-base" element={<ClientKnowledgeBasePage />} />
                <Route path="knowledge-base/:articleId" element={<ClientKnowledgeArticlePage />} />
                <Route path="documents" element={<ClientVaultPage />} />
                <Route path="profile" element={<ClientProfilePage />} />
              </Route>
              <Route path="/*" element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </SetupGate>
        </Router>
        <ToastContainer position={toastPosition} autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover style={{
          zIndex: "var(--toast-z-index, 15000000)"
        }} />
        </PermissionsProvider>
      </AuthProvider>
      </AppGeneralSettingsProvider>
    </ThemeProvider>;
}
