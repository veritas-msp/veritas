import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { setupMfa, verifyMfa } from "../../api/mfa";
import { showError, showSuccess } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getMfaEnrollmentCopy } from "./mfaEnrollmentI18n";
import styles from "./MfaEnrollmentModal.module.css";
export default function MfaEnrollmentModal({
  onClose,
  onEnabled
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getMfaEnrollmentCopy(locale), [locale]);
  const [step, setStep] = useState("prompt");
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const data = await setupMfa();
      setSetupData(data);
      setStep("setup");
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleVerify = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      await verifyMfa(code.trim());
      showSuccess(copy.toasts.enabled);
      onEnabled?.();
      onClose();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="mfa-modal-title">
      <div className={styles.modal}>
        {step === "prompt" && <>
            <div className={styles.iconWrap}>
              <Icon icon="mdi:shield-key" className={styles.icon} aria-hidden />
            </div>
            <h2 id="mfa-modal-title" className={styles.title}>
              {copy.prompt.title}
            </h2>
            <p className={styles.text}>{copy.prompt.text}</p>
            <p className={styles.hint}>{copy.prompt.hint}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={handleStartSetup} disabled={loading}>
                {loading ? copy.prompt.loading : copy.prompt.configure}
              </button>
              <button type="button" className={styles.btnGhost} onClick={onClose} disabled={loading}>
                {copy.prompt.later}
              </button>
            </div>
          </>}

        {step === "setup" && setupData && <>
            <h2 className={styles.title}>{copy.setup.title}</h2>
            <p className={styles.text}>{copy.setup.text}</p>
            <div className={styles.qrWrap}>
              <img src={setupData.qrCodeDataUrl} alt={copy.qrAlt} className={styles.qr} />
            </div>
            <p className={styles.secret}>
              {copy.setup.manualKey} <code>{setupData.secret}</code>
            </p>
            <form className={styles.form} onSubmit={handleVerify}>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={copy.setup.codePlaceholder} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className={styles.codeInput} disabled={loading} required />
              <div className={styles.actions}>
                <button type="submit" className={styles.btnPrimary} disabled={loading || code.length < 6}>
                  {loading ? copy.setup.verifying : copy.setup.activate}
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => {
              setStep("prompt");
              setCode("");
            }} disabled={loading}>
                  {copy.setup.back}
                </button>
              </div>
            </form>
          </>}
      </div>
    </div>;
}
