import React from "react";
import { FaGlobe } from "react-icons/fa";
import { useTheme } from "../../../../hooks/useTheme";
import styles from "../MonitoringSummary.module.css";
export default function NDDTitle() {
  const {
    theme
  } = useTheme();
  return <div className={styles.serviceModuleTitleWrapper}>
      <div>
        <h2 className={styles.serviceModuleSubTitle}>
          <FaGlobe style={{
          fontSize: '2.5rem',
          color: theme === 'dark' ? '#d1d5db' : '#000000',
          verticalAlign: 'middle',
          display: 'inline-block',
          marginRight: '0.5rem'
        }} />
          Domain name
        </h2>
        <p className={styles.serviceModuleSubTitleDescription}>
          Management and tracking of your domain names
        </p>
      </div>
    </div>;
}
