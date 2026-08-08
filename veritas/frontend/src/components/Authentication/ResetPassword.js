import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../../utils/toast";
import { useForceLightTheme } from "../../hooks/useForceLightTheme";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAuthCopy } from "./authI18n";
import API_BASE_URL from "../../config";
import styles from "./AuthPage.module.css";
export default function ResetPassword() {
  useForceLightTheme();
  const locale = useAppLocale();
  const copy = useMemo(() => getAuthCopy(locale), [locale]);
  const reset = copy.reset;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash?.startsWith("#") ? window.location.hash.slice(1) : "";
    const t = new URLSearchParams(hash).get("token") || new URLSearchParams(window.location.search).get("token");
    if (!t) {
      showError(reset.invalidLink);
      navigate("/login");
    } else {
      setToken(t);
    }
  }, [navigate, reset.invalidLink]);
  const isStrongPassword = value => value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  const handleReset = async e => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      return showError(reset.passwordTooWeak || "Password is too weak: at least 12 characters, including uppercase, lowercase, a number, and a special character.");
    }
    if (password !== confirm) return showError(reset.passwordMismatch);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });
      if (res.ok) {
        showSuccess(reset.success);
        navigate("/login");
      } else {
        const data = await res.json();
        showError(data.error || reset.error);
      }
    } catch {
      showError(reset.networkError);
    } finally {
      setLoading(false);
    }
  };
  return <div className={styles.wrapper}>
      <aside className={styles.left}>
        <div className={styles.leftTop}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>V</div>
            <span className={styles.brandName}>Veritas</span>
          </div>
          <h2 className={styles.leftHeadline}>{reset.headline}</h2>
          <p className={styles.leftSub}>{reset.headlineSub}</p>
        </div>
      </aside>

      <main className={styles.right}>
        <div className={styles.card} style={{
        minHeight: "auto"
      }}>
          <header className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>{reset.title}</h1>
            <p className={styles.cardSub}>{reset.sub}</p>
          </header>

          <form className={styles.form} onSubmit={handleReset}>
            <div className={styles.field}>
              <label htmlFor="reset-password">{reset.newPassword}</label>
              <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="reset-confirm">{reset.confirmPassword}</label>
              <input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} disabled={loading} required />
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? reset.saving : reset.submit}
            </button>
          </form>
        </div>
      </main>
    </div>;
}
