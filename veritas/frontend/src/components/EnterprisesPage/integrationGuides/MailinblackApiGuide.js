import { Icon } from "@iconify/react";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";
const DEFAULT_API_URL = "https://api.mailinblack.com";
const PARTNER_PORTAL_URL = "https://partner.mailinblack.com";
export default function MailinblackApiGuide({
  dedicated = false
}) {
  return <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Get your API key</h3>
        <p className={formStyles.sectionDesc}>
          {dedicated ? "Generate an API key in the client's Control Center, then paste it into Veritas." : "Generate an API key in the partner portal, then paste it into Veritas."}
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>1</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Sign in to the portal</p>
            <p className={styles.guideStepDesc}>
              Open{" "}
              <a href={PARTNER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                partner.mailinblack.com
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>{" "}
              {dedicated ? "or the relevant client's Control Center." : "with your MSP reseller account."}
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>2</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Generate an API key</p>
            <p className={styles.guideStepDesc}>
              Navigate to <strong>Manager area</strong> → <strong>Integration</strong> →{" "}
              <strong>API keys</strong> → <strong>Generate an API key</strong>. Choose{" "}
              <strong>read-only</strong> mode, enable <strong>Management</strong> and{" "}
              <strong>Protect</strong>, then copy the generated key.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>3</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Paste the key into Veritas</p>
            <p className={styles.guideStepDesc}>
              API URL: instance root (e.g.{" "}
              <code className={styles.guideCode}>https://app.mailinblack.com/mibc-fr-06</code> ou{" "}
              <code className={styles.guideCode}>{DEFAULT_API_URL}</code>). Collez la{" "}
              <strong>API key</strong>, test, then save · Veritas handles the rest
              (session token, client ID, synchronization).
            </p>
          </div>
        </li>
      </ol>
    </>;
}
