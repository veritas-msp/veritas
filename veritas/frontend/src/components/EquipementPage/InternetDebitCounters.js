import React from "react";
import { Icon } from "@iconify/react";
import { parseInternetDebitMbps } from "./internetConnectionUtils";
import styles from "./InternetDebitCounters.module.css";
function DebitCounter({
  label,
  icon,
  value,
  mbps,
  maxMbps,
  variant
}) {
  const ratio = mbps && maxMbps ? Math.min(100, Math.round(mbps / maxMbps * 100)) : 0;
  return <div className={`${styles.counter} ${styles[`counter_${variant}`]}`}>
      <div className={styles.counterHead}>
        <span className={styles.counterIconWrap}>
          <Icon icon={icon} aria-hidden />
        </span>
        <span className={styles.counterLabel}>{label}</span>
      </div>
      <strong className={styles.counterValue}>{value}</strong>
      <div className={styles.counterTrack} aria-hidden>
        <span className={styles.counterFill} style={{
        width: `${Math.max(ratio, 8)}%`
      }} />
      </div>
    </div>;
}
export default function InternetDebitCounters({
  download = "",
  upload = "",
  combined = ""
}) {
  const downStr = String(download || "").trim();
  const upStr = String(upload || "").trim();
  const combinedStr = String(combined || "").trim();
  const downMbps = parseInternetDebitMbps(downStr || combinedStr);
  const upMbps = parseInternetDebitMbps(upStr);
  const maxMbps = Math.max(downMbps || 0, upMbps || 0, 100);
  if (!downStr && !upStr && !combinedStr) return null;
  if (downStr && upStr) {
    return <div className={styles.grid}>
        <DebitCounter label="Descendant" icon="mdi:arrow-down-bold" value={downStr} mbps={downMbps} maxMbps={maxMbps} variant="download" />
        <DebitCounter label="Montant" icon="mdi:arrow-up-bold" value={upStr} mbps={upMbps} maxMbps={maxMbps} variant="upload" />
      </div>;
  }
  const singleValue = downStr || upStr || combinedStr;
  const isUpload = Boolean(upStr && !downStr);
  return <div className={styles.gridSingle}>
      <DebitCounter label={isUpload ? "Montant" : "Descendant"} icon={isUpload ? "mdi:arrow-up-bold" : "mdi:arrow-down-bold"} value={singleValue} mbps={isUpload ? upMbps : downMbps} maxMbps={maxMbps} variant={isUpload ? "upload" : "download"} />
    </div>;
}
