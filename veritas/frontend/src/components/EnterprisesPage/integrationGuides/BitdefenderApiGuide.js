import { Icon } from "@iconify/react";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";
const DEFAULT_API_URL = "https://cloudgz.gravityzone.bitdefender.com/api";
const GRAVITYZONE_ACCOUNT_URL = "https://cloudgz.gravityzone.bitdefender.com/#!/my-account";
export default function BitdefenderApiGuide({
  dedicated = false
}) {
  return <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Get your API credentials</h3>
        <p className={formStyles.sectionDesc}>
          {dedicated ? "Follow these steps in the client's GravityZone Control Center to create an API key and obtain the URL for the dedicated Veritas tenant." : "Follow these steps in the GravityZone Control Center to create an API key and obtain the access URL for Veritas."}
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>1</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Sign in to GravityZone</p>
            <p className={styles.guideStepDesc}>
              Open the portal{" "}
              <a href={GRAVITYZONE_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                cloudgz.gravityzone.bitdefender.com
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>{" "}
              with an account that has tenant administration rights.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>2</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Open the API section</p>
            <p className={styles.guideStepDesc}>
              User menu (top-right) → <strong>My account</strong> → <strong>API</strong>{" "}
              section of the Control Center.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>3</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Create an API key</p>
            <p className={styles.guideStepDesc}>
              Click <strong>Add</strong> to generate a new key. Enable the required
              permissions (companies, accounts, licenses, network), then copy the displayed key
              · it will not be shown again.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>4</span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Retrieve the access URL</p>
            <p className={styles.guideStepDesc}>
              On the same page, copy the <strong>API access URL</strong> (often{" "}
              <code className={styles.guideCode}>{DEFAULT_API_URL}</code>) and paste it into the
              Veritas API URL field together with the key obtained in the previous step.
            </p>
          </div>
        </li>
      </ol>
    </>;
}
