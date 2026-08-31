import { getClientOnboardingInfo } from "../../../utils/clientOnboarding";
import styles from "./ClientOnboardingBadge.module.css";

export default function ClientOnboardingBadge({
  client = null,
  contratDebut = null,
  label = "Onboarding",
  title = "",
  className = ""
}) {
  const info = getClientOnboardingInfo(client, contratDebut);
  if (!info) return null;
  return (
    <span className={`${styles.badge} ${className}`.trim()} title={title || label}>
      {label}
    </span>
  );
}
