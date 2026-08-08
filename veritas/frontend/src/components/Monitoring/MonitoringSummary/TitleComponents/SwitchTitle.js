import React from "react";
import styles from "../MonitoringSummary.module.css";
import { FaEthernet } from "react-icons/fa";
export default function SwitchTitle() {
  return <div id="switch-section" className={styles.switchTitleWrapper}>
      <div>
        <h2 className={styles.switchSubTitle}>
          <FaEthernet size="2.5rem" />
          YOUR SWITCHES
        </h2>
        <p className={styles.switchSubTitleDescription}>
          Topology and status of your switches by site
        </p>
      </div>
    </div>;
}
