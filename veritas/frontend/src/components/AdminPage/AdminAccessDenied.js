import { Icon } from "@iconify/react";
import layout from "./AdminPanelLayout.module.css";
import { useAdminPageCopy } from "../../hooks/useAdminCopy";
export default function AdminAccessDenied() {
  const copy = useAdminPageCopy("accessDenied");
  return <div className={layout.denied}>
      <div className={layout.deniedCard}>
        <Icon icon="mdi:shield-lock" className={layout.deniedIcon} />
        <h1 className={layout.deniedTitle}>{copy.title}</h1>
        <p className={layout.deniedText}>{copy.text}</p>
      </div>
    </div>;
}
