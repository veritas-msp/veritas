import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchRmmEnrollmentTokens } from "../../api/rmm";
import RmmEnrollmentTokenValue from "./RmmEnrollmentTokenValue";
import SmartTooltip from "../SmartTooltip";
import styles from "./EnterpriseRmmEnrollmentHero.module.css";

export default function EnterpriseRmmEnrollmentHero({
  clientId,
  isAdmin,
  compact = false,
  labeled = false,
  title = "Enrollment token",
  itemClassName = "",
  tokenWrapClassName = ""
}) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadTokens = useCallback(async () => {
    if (!clientId || !isAdmin) {
      setTokens([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRmmEnrollmentTokens(String(clientId));
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, isAdmin]);
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);
  if (!isAdmin || loading) {
    return null;
  }
  const activeTokens = tokens.filter(t => t?.token);
  if (activeTokens.length === 0) {
    return null;
  }
  const primary = activeTokens[0];
  const extraCount = activeTokens.length - 1;
  const extraHint = extraCount > 0
    ? activeTokens.slice(1).map(t => t.label || `Token ${t.id?.slice(0, 8) || ""}`).join(", ")
    : null;

  if (labeled) {
    return (
      <span className={`${styles.labeled} ${itemClassName}`.trim()}>
        <span className={styles.labeledTitle}>{title}</span>
        <span className={`${styles.labeledValue} ${tokenWrapClassName}`.trim()}>
          <RmmEnrollmentTokenValue token={primary.token} full bare />
          {extraCount > 0 ? (
            <SmartTooltip
              content={`${extraCount} other active token${extraCount > 1 ? "s" : ""}${extraHint ? `: ${extraHint}` : ""}`}
              as="span"
            >
              <span className={styles.extraCount} aria-label={`${extraCount} other active tokens`}>
                +{extraCount}
              </span>
            </SmartTooltip>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <span className={itemClassName}>
      <SmartTooltip content={title}>
        <Icon icon="mdi:key-outline" aria-hidden />
      </SmartTooltip>
      {!compact && <span>{title}</span>}
      <span className={tokenWrapClassName}>
        <RmmEnrollmentTokenValue token={primary.token} />
      </span>
      {extraCount > 0 ? (
        <SmartTooltip
          content={`${extraCount} other active token${extraCount > 1 ? "s" : ""}${extraHint ? `: ${extraHint}` : ""}`}
          as="span"
        >
          <span aria-label={`${extraCount} other active tokens`}>+{extraCount}</span>
        </SmartTooltip>
      ) : null}
    </span>
  );
}
