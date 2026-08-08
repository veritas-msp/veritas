import { Icon } from "@iconify/react";
import { useMemo } from "react";
import { useAppLocale } from "../../../hooks/useAppGeneralSettings";
import { getOvhApiGuideCopy } from "../../AdminPage/adminIntegrationModalsI18n";
import formStyles from "../EnterpriseFormModal.module.css";
import styles from "../../AdminPage/BitdefenderIntegrationModal.module.css";
import ovhStyles from "../../AdminPage/OvhIntegrationModal.module.css";
export const OVH_CREATE_APP_URL = "https://eu.api.ovh.com/createApp/";
export const OVH_TOKEN_URL_DOMAIN = "https://eu.api.ovh.com/createToken/index.cgi?GET=/domain/*";
export const OVH_TOKEN_URL_ALL = "https://eu.api.ovh.com/createToken/index.cgi?GET=/*";
export default function OvhApiGuide({
  variant = "client",
  locale: localeProp
}) {
  const appLocale = useAppLocale();
  const locale = localeProp || appLocale;
  const copy = useMemo(() => getOvhApiGuideCopy(locale), [locale]);
  const isAdmin = variant === "admin";
  const steps = copy.steps;
  return <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.title}</h3>
        <p className={formStyles.sectionDesc}>
          {copy.desc.split("GET /domain")[0]}
          <strong>GET /domain</strong>
          {copy.desc.split("GET /domain")[1] || ""}
        </p>
      </div>

      <ol className={styles.guideSteps}>
        <li className={styles.guideStep}>
          <span className={`${styles.guideStepNum} ${ovhStyles.guideStepNumOvh}`} aria-hidden>
            1
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>{steps[0].title}</p>
            <p className={styles.guideStepDesc}>
              {steps[0].desc.split(steps[0].linkLabel)[0]}
              <a href={OVH_CREATE_APP_URL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                {steps[0].linkLabel}
                <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
              </a>
              {steps[0].desc.split(steps[0].linkLabel)[1] || ""}
            </p>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={`${styles.guideStepNum} ${ovhStyles.guideStepNumOvh}`} aria-hidden>
            2
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>{steps[1].title}</p>
            <p className={styles.guideStepDesc}>{steps[1].desc}</p>
            <ul className={ovhStyles.guidePermissionList}>
              <li>
                <strong>{steps[1].recommended}</strong>
                <br />
                <a href={OVH_TOKEN_URL_DOMAIN} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                  {steps[1].recommendedLink}
                  <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
                </a>
              </li>
              <li>
                <strong>{steps[1].alternative}</strong>
                <br />
                <a href={OVH_TOKEN_URL_ALL} target="_blank" rel="noopener noreferrer" className={styles.guideExternalLink}>
                  {steps[1].alternativeLink}
                  <Icon icon="mdi:open-in-new" className={styles.guideExternalIcon} aria-hidden />
                </a>
              </li>
            </ul>
          </div>
        </li>
        <li className={styles.guideStep}>
          <span className={`${styles.guideStepNum} ${ovhStyles.guideStepNumOvh}`} aria-hidden>
            3
          </span>
          <div className={styles.guideStepBody}>
            <p className={styles.guideStepTitle}>{steps[2].title}</p>
            <p className={styles.guideStepDesc}>
              {isAdmin ? steps[2].descAdmin : steps[2].descClient}
            </p>
          </div>
        </li>
      </ol>
    </>;
}
