import { Icon } from "@iconify/react";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";
import msStyles from "../MicrosoftTenantConfigModal.module.css";
import { GRAPH_API_PERMISSIONS } from "../microsoftTenantFormConfig";
const ENTRA_PORTAL_URL = "https://entra.microsoft.com";
const APP_REGISTRATIONS_URL = "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade";
export default function EntraApiGuide() {
  return <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>Create an application in Entra ID</h3>
        <p className={formStyles.sectionDesc}>
          Register an application with client-secret authentication, grant Microsoft Graph
          application permissions, then copy the credentials into Veritas for this client.
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            1
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Open the Entra admin center</p>
            <p className={styles.guideStepDesc}>
              Sign in at{" "}
              <a href={ENTRA_PORTAL_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                entra.microsoft.com
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>{" "}
              with an account that has the <strong>Cloud Application Administrator</strong>{" "}
              or <strong>Global Administrator</strong> role on the client's tenant.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            2
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Register a new application</p>
            <p className={styles.guideStepDesc}>
              Go to <strong>Identity</strong> → <strong>Applications</strong> →{" "}
              <strong>App registrations</strong> → <strong>New registration</strong>.
              Give it a clear name (e.g. “Veritas · Client name”), keep the account type set to
              “Accounts in this organizational directory only”, and do not add a redirect URI.
            </p>
            <p className={styles.guideStepDesc}>
              Direct link:{" "}
              <a href={APP_REGISTRATIONS_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                Azure app registrations
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            3
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Copy the Tenant ID and Client ID</p>
            <p className={styles.guideStepDesc}>
              On the application's <strong>Overview</strong> page, copy the
              <strong>Directory (tenant) ID</strong> and <strong>Application (client) ID</strong>.
              Paste them into Veritas (Tenant ID and Client ID).
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            4
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Create a client secret</p>
            <p className={styles.guideStepDesc}>
              Go to <strong>Certificates &amp; secrets</strong> → <strong>New client secret</strong>.
              Choose a duration (12 or 24 months is recommended), immediately copy the{" "}
              <strong>secret value</strong> · it will not be shown again · then paste it into
              Veritas. Record the secret identifier (Key ID) if you want to track its expiry.
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            5
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Grant Microsoft Graph permissions</p>
            <p className={styles.guideStepDesc}>
              Go to <strong>API permissions</strong> → <strong>Add a permission</strong> →{" "}
              <strong>Microsoft Graph</strong> → <strong>Application permissions</strong>.
              Add the permissions below, then click <strong>Grant admin consent</strong> for the tenant.
            </p>
            <ul className={msStyles.permissionsList}>
              {GRAPH_API_PERMISSIONS.map(perm => <li key={perm}>
                  <code className={styles.guideCode}>{perm}</code>
                </li>)}
            </ul>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={styles.guideStepNum} aria-hidden>
            6
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>Test and save in Veritas</p>
            <p className={styles.guideStepDesc}>
              Return to Veritas, enter the Tenant ID, Client ID, and Client Secret, then click{" "}
              <strong>Test connection</strong> and <strong>Save</strong>. Microsoft 365
              statistics will become available in a new tab after synchronization.
            </p>
          </div>
        </li>
      </ol>
    </>;
}
