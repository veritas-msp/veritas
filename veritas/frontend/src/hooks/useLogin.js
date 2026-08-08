import { useEffect, useState } from "react";
import { showError } from "../utils/toast";
import API_BASE_URL from "../config";
import { validateMfaLogin } from "../api/mfa";
export function useLogin(onLogin) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaPending, setMfaPending] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("rememberedEmail");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);
  const finishLogin = async data => {
    rememberMe ? localStorage.setItem("rememberedEmail", email) : localStorage.removeItem("rememberedEmail");
    onLogin({
      id: data.id,
      email: data.email,
      username: data.username || null,
      role: data.role,
      client_id: data.client_id ?? null,
      mfa_enabled: data.mfa_enabled ?? false
    });
  };
  const handleLogin = async (portal = "agent") => {
    setLoading(true);
    const minDelay = new Promise(r => setTimeout(r, 1200));
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          portal
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 || data.code === "RATE_LIMITED") {
          throw new Error(data.error || "Too many login attempts. Wait one minute or restart the backend in development.");
        }
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      await minDelay;
      if (data.mfaRequired) {
        setMfaPending({
          mfaToken: data.mfaToken
        });
        return;
      }
      await finishLogin(data);
    } catch (err) {
      await minDelay;
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleMfaLogin = async code => {
    if (!mfaPending?.mfaToken) return;
    setLoading(true);
    const minDelay = new Promise(r => setTimeout(r, 800));
    try {
      const data = await validateMfaLogin(mfaPending.mfaToken, code);
      await minDelay;
      setMfaPending(null);
      await finishLogin({
        ...data,
        mfa_enabled: true
      });
    } catch (err) {
      await minDelay;
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const cancelMfaLogin = () => {
    setMfaPending(null);
    setPassword("");
  };
  return {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    loading,
    handleLogin,
    showPassword,
    setShowPassword,
    mfaPending,
    handleMfaLogin,
    cancelMfaLogin
  };
}
