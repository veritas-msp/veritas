import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { activateLicense, getLicenseStatus, refreshLicenseStatus } from "../../api/license";
import { getVeritasCommercialLinks } from "../../config/commercial";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { Page, Card, Btn, Input, Badge } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import CommunityFeatureBadge from "../Misc/ProFeature/CommunityFeatureBadge";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { resolveLicenseApiError, resolveLicenseStatusMessage } from "./licensePageUtils";
import s from "./AdminLicense.module.css";
const COMMERCIAL_LINKS = getVeritasCommercialLinks();
function statusBadgeVariant(status, valid) {
  if (valid) return "success";
  if (status === "past_due" || status === "billing_unconfigured" || status === "network_error") return "warn";
  if (status === "missing") return "muted";
  return "default";
}
function formatCheckedAt(value, locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const localeTag = `${locale}-${locale.toUpperCase()}`;
  return date.toLocaleString(localeTag, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function SubscriptionFaqItem({
  href,
  icon,
  question,
  answer,
  linkLabel
}) {
  const external = href.startsWith("http");
  const isMailto = href.startsWith("mailto:");
  return <details className={s.faqItem}>
      <summary className={s.faqSummary}>
        <Icon icon={icon} className={s.faqSummaryIcon} aria-hidden />
        <span className={s.faqQuestion}>{question}</span>
      </summary>
      <div className={s.faqAnswer}>
        <p>{answer}</p>
        <a className={s.faqLink} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
          {linkLabel}
          <Icon icon={isMailto ? "mdi:email-outline" : "mdi:open-in-new"} className={s.faqLinkIcon} aria-hidden />
        </a>
      </div>
    </details>;
}
export default function AdminLicense() {
  const copy = useAdminPageCopy("license");
  const adminCopy = useAdminCommonCopy();
  const appLocale = useAppLocale();
  const subscriptionFaq = useMemo(() => [{
    key: "manage",
    href: COMMERCIAL_LINKS.account,
    icon: "mdi:credit-card-outline",
    question: copy.subscriptionFaq.manage.q,
    answer: copy.subscriptionFaq.manage.a,
    linkLabel: copy.manageSubscription
  }, {
    key: "recover",
    href: COMMERCIAL_LINKS.accountRecover,
    icon: "mdi:key-outline",
    question: copy.subscriptionFaq.recover.q,
    answer: copy.subscriptionFaq.recover.a,
    linkLabel: copy.recoverKey
  }, {
    key: "pricing",
    href: COMMERCIAL_LINKS.pricing,
    icon: "mdi:tag-outline",
    question: copy.subscriptionFaq.pricing.q,
    answer: copy.subscriptionFaq.pricing.a,
    linkLabel: copy.pricing
  }, {
    key: "support",
    href: `mailto:${COMMERCIAL_LINKS.supportEmail}`,
    icon: "mdi:lifebuoy",
    question: copy.subscriptionFaq.support.q,
    answer: copy.subscriptionFaq.support.a,
    linkLabel: copy.commercialSupport
  }], [copy]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [info, setInfo] = useState(null);
  const load = async () => {
    setLoading(true);
    try {
      setInfo(await getLicenseStatus());
    } catch (e) {
      toast.error(resolveLicenseApiError(e, copy, "loadError"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const license = info?.license;
  const isValid = Boolean(license?.valid);
  const status = license?.status || "missing";
  const metaLine = useMemo(() => {
    if (!license) return "";
    const parts = [];
    if (license.agentCount != null) {
      parts.push(license.agentCount > 1 ? interpolate(copy.agentCountPlural, {
        count: license.agentCount
      }) : interpolate(copy.agentCount, {
        count: license.agentCount
      }));
    }
    if (license.billingInterval) {
      parts.push(license.billingInterval === "annual" ? copy.billingAnnual : copy.billingMonthly);
    }
    if (license.customerEmail) parts.push(license.customerEmail);
    const checkedAt = formatCheckedAt(license.checkedAt, appLocale);
    if (checkedAt) parts.push(interpolate(copy.checkedAt, {
      date: checkedAt
    }));
    return parts.join(" · ");
  }, [license, copy, appLocale]);
  const statusMessage = useMemo(() => resolveLicenseStatusMessage({
    isValid,
    status,
    copy
  }), [isValid, status, copy]);
  const statusLabel = copy.status?.[status] || status;
  const onActivate = async e => {
    e.preventDefault();
    const key = licenseKey.trim();
    if (!key) {
      toast.warn(copy.enterKey);
      return;
    }
    setActivating(true);
    try {
      const result = await activateLicense(key);
      toast.success(copy.activateSuccess || copy.activated);
      setLicenseKey("");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(resolveLicenseApiError(err, copy, "activateError"));
    } finally {
      setActivating(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setInfo(await refreshLicenseStatus());
      toast.success(copy.refreshed);
    } catch (err) {
      toast.error(resolveLicenseApiError(err, copy, "refreshError"));
    } finally {
      setRefreshing(false);
    }
  };
  return <Page>
      <Card title={copy.title} action={<Btn variant="secondary" icon="mdi:refresh" onClick={onRefresh} disabled={refreshing || loading}>
            {refreshing ? copy.refreshing : copy.refresh}
          </Btn>}>
        {loading ? <p className={adminUi.adminMutedText}>{adminCopy.loading}</p> : <div className={s.layout}>
            <div className={s.statusBar}>
              {isValid ? <ProFeatureBadge variant="inline" /> : <CommunityFeatureBadge variant="inline" />}
              <Badge variant={statusBadgeVariant(status, isValid)}>
                {isValid ? copy.proActive : statusLabel}
              </Badge>
              {info?.keyHint ? <Badge variant="muted">{interpolate(copy.keyHint, {
              hint: info.keyHint
            })}</Badge> : null}
            </div>

            <p className={`${s.statusMessage} ${!isValid ? s.statusMessageError : ""}`}>
              {statusMessage}
            </p>

            {metaLine ? <p className={s.metaLine}>{metaLine}</p> : null}

            {license?.devBypass ? <p className={s.devHint}>
                {interpolate(copy.devHint, {
            code: copy.devCode
          })}
              </p> : null}

            {!isValid && <form onSubmit={onActivate} className={s.activateForm}>
                <Input value={licenseKey} onChange={e => setLicenseKey(e.target.value.toUpperCase())} placeholder={copy.keyPlaceholder} autoComplete="off" spellCheck={false} aria-label={copy.keyAria} />
                <Btn type="submit" icon="mdi:key-variant" disabled={activating}>
                  {activating ? copy.activating : copy.activatePro}
                </Btn>
              </form>}
          </div>}
      </Card>

      <Card title={copy.subscriptionTitle}>
        <p className={s.legalLinks}>
          <a href={COMMERCIAL_LINKS.legal} target="_blank" rel="noopener noreferrer">
            {copy.legal}
          </a>
          {" · "}
          <a href={COMMERCIAL_LINKS.privacy} target="_blank" rel="noopener noreferrer">
            {copy.privacy}
          </a>
        </p>
        <div className={s.faqList}>
          {subscriptionFaq.map(item => <SubscriptionFaqItem key={item.key} {...item} />)}
        </div>
      </Card>
    </Page>;
}
