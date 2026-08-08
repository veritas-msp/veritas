import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import SmartTooltip from "../SmartTooltip";
import styles from "./RmmEnrollmentTokenValue.module.css";

function formatTokenPreview(token, {
  full = false,
  compact = false
} = {}) {
  if (!token) return "";
  if (full) return token;
  const max = compact ? 10 : 14;
  if (token.length <= max) return token;
  const head = compact ? 4 : 6;
  const tail = 4;
  return `${token.slice(0, head)}…${token.slice(-tail)}`;
}

export default function RmmEnrollmentTokenValue({
  token,
  compact = false,
  full = false
}) {
  if (!token) {
    return null;
  }
  const handleCopy = async event => {
    event?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copied");
    } catch {
      toast.error("Unable to copy token");
    }
  };
  const preview = formatTokenPreview(token, {
    full,
    compact
  });
  const tooltip = full ? "Copy token" : `Copy token · ${token}`;
  return <div className={`${styles.wrap} ${compact ? styles.wrapCompact : ""} ${full ? styles.wrapFull : styles.wrapPreview}`}>
      <SmartTooltip content={tooltip} as="span">
        <button type="button" className={styles.tokenBtn} onClick={handleCopy} aria-label="Copy enrollment token">
          <code className={`${styles.token} ${full ? styles.tokenFull : ""}`}>{preview}</code>
          <Icon icon="mdi:content-copy" className={styles.copyIcon} aria-hidden />
        </button>
      </SmartTooltip>
    </div>;
}
