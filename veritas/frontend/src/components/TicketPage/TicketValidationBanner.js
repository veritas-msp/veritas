import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketValidationCopy } from "./ticketValidationI18n";
import styles from "./TicketDetailPage.module.css";

export default function TicketValidationBanner({
  requests = [],
  currentUserId = null,
  respondingId = null,
  canEdit = true,
  onRespond,
  onEdit
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketValidationCopy(locale), [locale]);
  const [responseDrafts, setResponseDrafts] = useState({});

  const pending = useMemo(
    () => (Array.isArray(requests) ? requests : []).filter(r => r?.isPending || r?.status === "pending"),
    [requests]
  );

  if (pending.length === 0) return null;

  return (
    <div className={styles.validationBannerList}>
      {pending.map(request => {
        const isValidator = String(request.validatorUserId || "") === String(currentUserId || "");
        const busy = String(respondingId) === String(request.id);
        const draft = responseDrafts[request.id] || "";
        return (
          <div key={request.id} className={styles.validationBanner}>
            <div className={styles.validationBannerMain}>
              <Icon icon="mdi:clipboard-check-outline" className={styles.validationBannerIcon} aria-hidden />
              <div className={styles.validationBannerText}>
                <strong>{copy.bannerTitle}</strong>
                <span>
                  {isValidator
                    ? copy.formatBannerForYou(request.requestedByName)
                    : copy.formatBannerWaiting(request.validatorName)}
                </span>
                {request.message ? <span className={styles.validationBannerMessage}>{copy.formatBannerMessage(request.message)}</span> : null}
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className={styles.validationEditBtn}
                  disabled={busy}
                  onClick={() => onEdit?.(request)}
                  title={copy.editActionTitle}
                  aria-label={copy.editActionTitle}
                >
                  <Icon icon="mdi:pencil-outline" aria-hidden />
                  {copy.editAction}
                </button>
              ) : null}
            </div>
            {isValidator ? (
              <div className={styles.validationBannerActions}>
                <input
                  type="text"
                  className={styles.validationResponseInput}
                  value={draft}
                  placeholder={copy.responsePlaceholder}
                  disabled={busy}
                  onChange={e =>
                    setResponseDrafts(prev => ({
                      ...prev,
                      [request.id]: e.target.value
                    }))
                  }
                />
                <button
                  type="button"
                  className={styles.validationApproveBtn}
                  disabled={busy}
                  onClick={() => onRespond?.(request, "approved", draft)}
                >
                  <Icon icon="mdi:check" aria-hidden />
                  {busy ? copy.responding : copy.approve}
                </button>
                <button
                  type="button"
                  className={styles.validationRejectBtn}
                  disabled={busy}
                  onClick={() => onRespond?.(request, "rejected", draft)}
                >
                  <Icon icon="mdi:close" aria-hidden />
                  {busy ? copy.responding : copy.reject}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
