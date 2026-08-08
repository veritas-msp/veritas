import React from "react";
import styles from "../MonitoringSummary.module.css";
import { IoServerSharp } from "react-icons/io5";
export default function StorageTitle() {
  return <div id="stockage-section" className={styles.storageTitleWrapper}>
      <div>
        <h2 className={styles.storageSubTitle}>
          <IoServerSharp size="2.5rem" />
          YOUR STORAGE
        </h2>
        <p className={styles.storageSubTitleDescription}>
          Topology and capacity of your storage by site
        </p>
      </div>
    </div>;
}
