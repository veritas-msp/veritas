import { Icon } from "@iconify/react";
import s from "./AdminGeneralSettingsPlatform.module.css";

export default function AdminGeneralSettingsLoading({ message }) {
  return (
    <div className={s.loadingState} role="status" aria-live="polite">
      <Icon icon="mdi:loading" className={s.loadingSpinner} aria-hidden />
      <p className={s.loadingText}>{message}</p>
    </div>
  );
}
