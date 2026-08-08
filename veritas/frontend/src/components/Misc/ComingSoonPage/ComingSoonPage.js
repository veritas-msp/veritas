import { Icon } from "@iconify/react";
import { getVeritasCommercialLinks } from "../../../config/commercial";
import styles from "./ComingSoonPage.module.css";
import adminStyles from "../../AdminPage/AdminPanel.module.css";
export default function ComingSoonPage({
  title,
  description,
  icon = "mdi:lock-outline",
  showProPricing = false
}) {
  const pricingUrl = getVeritasCommercialLinks().pricing;
  return <div className={adminStyles.simpleLayout}>
      <div className={styles.wrapper}>
        <div className={styles.iconWrap}>
          <Icon icon={icon} className={styles.icon} />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        {showProPricing ? <a className={styles.cta} href={pricingUrl} target="_blank" rel="noopener noreferrer">
            View Veritas Pro · pricing
          </a> : <span className={styles.badge}>Coming soon</span>}
      </div>
    </div>;
}
