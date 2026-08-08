import { VERITAS_NAME, VERITAS_VERSION } from "../../constants/version";
import styles from "./AppVersion.module.css";
export default function AppVersion({
  variant = "dark",
  className = ""
}) {
  return <span className={`${styles.badge} ${styles[variant]} ${className}`.trim()} title={`${VERITAS_NAME} ${VERITAS_VERSION}`}>
      v{VERITAS_VERSION}
    </span>;
}
