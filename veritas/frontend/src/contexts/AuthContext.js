import { createContext, useContext, useState, useEffect } from "react";
import { useLogin } from "../hooks/useLogin";
import { useSessionRenewal } from "../hooks/useSessionRenewal";
import API_BASE_URL from "../config";
import MfaEnrollmentModal from "../components/Authentication/MfaEnrollmentModal";
const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [mfaEnabled, setMfaEnabled] = useState(null);
  const [impersonating, setImpersonating] = useState(false);
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaPromptAfterLogin, setMfaPromptAfterLogin] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    loading,
    handleLogin: performLogin,
    mfaPending,
    handleMfaLogin,
    cancelMfaLogin
  } = useLogin(onLoginSuccess);
  useSessionRenewal(Boolean(user));
  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include"
    }).then(res => res.ok ? res.json() : null).then(data => {
      if (data) {
        setUser({
          id: data.id,
          email: data.email,
          username: data.username || null,
          client_id: data.client_id ?? null,
          avatar: data.avatar || null,
          profile: data.profile || null
        });
        setUserRole(data.role);
        setMfaEnabled(Boolean(data.mfa_enabled));
        setImpersonating(Boolean(data.impersonating));
      }
    }).catch(() => {}).finally(() => setLoadingSession(false));
  }, []);
  useEffect(() => {
    if (!user || mfaEnabled !== false || impersonating || !mfaPromptAfterLogin) {
      if (!mfaPromptAfterLogin) {
        setShowMfaPrompt(false);
      }
      return;
    }
    setMfaPromptAfterLogin(false);
    setShowMfaPrompt(true);
  }, [user, mfaEnabled, impersonating, mfaPromptAfterLogin]);
  function onLoginSuccess({
    id,
    email,
    username,
    role,
    client_id,
    mfa_enabled,
    avatar
  }) {
    setUser({
      id,
      email,
      username: username || null,
      client_id: client_id ?? null,
      avatar: avatar || null
    });
    setUserRole(role);
    setMfaEnabled(Boolean(mfa_enabled));
    setImpersonating(false);
    if (!mfa_enabled) {
      setMfaPromptAfterLogin(true);
    }
  }
  function patchUser(partial) {
    if (!partial || typeof partial !== "object") return;
    setUser(prev => prev ? {
      ...prev,
      ...partial
    } : prev);
  }
  async function refreshSession() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include"
    });
    if (!res.ok) {
      throw new Error("Unable to refresh session");
    }
    const data = await res.json();
    setUser({
      id: data.id,
      email: data.email,
      username: data.username || null,
      client_id: data.client_id ?? null,
      avatar: data.avatar || null,
      profile: data.profile || null
    });
    setUserRole(data.role);
    setMfaEnabled(Boolean(data.mfa_enabled));
    setImpersonating(Boolean(data.impersonating));
    return data;
  }
  async function logout() {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    setUser(null);
    setUserRole(null);
    setMfaEnabled(null);
    setImpersonating(false);
    setMfaPromptAfterLogin(false);
    setShowMfaPrompt(false);
    window.location.href = "/login";
  }
  return <AuthContext.Provider value={{
    user,
    userRole,
    impersonating,
    mfaEnabled,
    loading: loading || loadingSession,
    handleLogin: performLogin,
    handleLogout: logout,
    patchUser,
    refreshSession,
    setMfaEnabledFlag: enabled => setMfaEnabled(Boolean(enabled)),
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    mfaPending,
    handleMfaLogin,
    cancelMfaLogin
  }}>
      {children}
      {showMfaPrompt && user && <MfaEnrollmentModal onClose={() => setShowMfaPrompt(false)} onEnabled={() => setMfaEnabled(true)} />}
    </AuthContext.Provider>;
}
