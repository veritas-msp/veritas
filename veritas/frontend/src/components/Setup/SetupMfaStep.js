import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { setupSetupAdminMfa, verifySetupAdminMfa } from "../../api/setup";
import { showError } from "../../utils/toast";
import styles from "./SetupMfaStep.module.css";
export default function SetupMfaStep({
  copy,
  loading,
  onLoadingChange,
  onComplete
}) {
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      onLoadingChange(true);
      try {
        const data = await setupSetupAdminMfa();
        if (!cancelled) {
          setSetupData(data);
          setBootstrapped(true);
        }
      } catch (err) {
        if (!cancelled) {
          showError(err.message);
        }
      } finally {
        if (!cancelled) {
          onLoadingChange(false);
        }
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [onLoadingChange]);
  const handleVerify = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    onLoadingChange(true);
    try {
      await verifySetupAdminMfa(code.trim());
      onComplete?.();
    } catch (err) {
      showError(err.message);
    } finally {
      onLoadingChange(false);
    }
  };
  return <div className={styles.wrap}>
      <div className={styles.iconWrap}>
        <Icon icon="mdi:shield-key" className={styles.icon} aria-hidden />
      </div>
      <h2 className={styles.title}>{copy.title}</h2>
      <p className={styles.text}>{copy.subtitle}</p>

      {loading && !setupData ? <p className={styles.loading}>{copy.loading}</p> : null}

      {setupData && bootstrapped ? <>
          <div className={styles.qrWrap}>
            <img src={setupData.qrCodeDataUrl} alt={copy.qrAlt} className={styles.qr} />
          </div>
          <p className={styles.secret}>
            {copy.manualKey} <code>{setupData.secret}</code>
          </p>
          <form className={styles.form} onSubmit={handleVerify}>
            <SetupFieldLike id="mfaCode" label={copy.codeLabel} hint={copy.codeHint}>
              <input id="mfaCode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={copy.codePlaceholder} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} disabled={loading} required />
            </SetupFieldLike>
            <div className={styles.actions}>
              <button type="submit" className={styles.btnPrimary} disabled={loading || code.length < 6}>
                {loading ? copy.verifying : copy.finish}
              </button>
            </div>
          </form>
        </> : null}
    </div>;
}
function SetupFieldLike({
  id,
  label,
  hint,
  children
}) {
  return <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      {children}
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
    </div>;
}
