import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import {
  clearClientUnifiLink,
  fetchUnifiCarrierSubscribers,
  fetchUnifiHosts,
  fetchUnifiSites,
  getClientUnifiGlobalStatus,
  getClientUnifiLink,
  saveClientUnifiLink
} from "../../api/unifi";
import { showError, showSuccess } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import formStyles from "./EnterpriseFormModal.module.css";
import unifiStyles from "../AdminPage/UnifiIntegrationModal.module.css";

const COPY = {
  fr: {
    title: "Lien UniFi",
    subtitle: "Lier un site du tenant global Site Manager",
    eyebrow: "Intégration",
    closeAria: "Fermer",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    unlink: "Dissocier",
    host: "Console (host)",
    site: "Site UniFi",
    subscriber: "Abonné Carrier Fabric (optionnel)",
    selectHost: "Choisir une console…",
    selectSite: "Choisir un site…",
    selectSubscriber: "Aucun / choisir…",
    loading: "Chargement…",
    notConfigured: "L’intégration UniFi n’est pas active. Configurez le tenant global dans Administration → Intégrations.",
    loadError: "Impossible de charger les sites UniFi.",
    saveSuccess: "Configuration UniFi enregistrée.",
    unlinkSuccess: "Lien UniFi retiré.",
    saveError: "Enregistrement impossible.",
    current: "Lien actuel",
    hintGlobal: "Tenant global MSP : clé Site Manager admin, multi-sites."
  },
  en: {
    title: "UniFi link",
    subtitle: "Link a site from the global Site Manager tenant",
    eyebrow: "Integration",
    closeAria: "Close",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    unlink: "Unlink",
    host: "Console (host)",
    site: "UniFi site",
    subscriber: "Carrier Fabric subscriber (optional)",
    selectHost: "Choose a console…",
    selectSite: "Choose a site…",
    selectSubscriber: "None / choose…",
    loading: "Loading…",
    notConfigured: "UniFi integration is not active. Configure the global tenant in Administration → Integrations.",
    loadError: "Unable to load UniFi sites.",
    saveSuccess: "UniFi configuration saved.",
    unlinkSuccess: "UniFi link removed.",
    saveError: "Unable to save.",
    current: "Current link",
    hintGlobal: "Global MSP tenant: admin Site Manager key, multi-site."
  }
};

function pickCopy(locale) {
  return COPY[locale] || COPY.en;
}

export default function UnifiSiteLinkModal({ open, clientId, onClose, onSaved }) {
  const locale = useAppLocale();
  const copy = useMemo(() => pickCopy(locale), [locale]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [hosts, setHosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [hostId, setHostId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [link, setLink] = useState(null);

  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [status, linkRes] = await Promise.all([
          getClientUnifiGlobalStatus().catch(() => ({ configured: false, enabled: false })),
          getClientUnifiLink(clientId).catch(() => ({ link: null }))
        ]);
        if (cancelled) return;
        const isConfigured = Boolean(status?.configured || status?.enabled || status?.keys?.siteManager);
        setConfigured(isConfigured);
        const current = linkRes?.link || null;
        setLink(current);
        setHostId(current?.hostId || "");
        setSiteId(current?.siteId || "");
        setSubscriberId(current?.subscriberId || "");
        if (isConfigured) {
          const hostsRes = await fetchUnifiHosts();
          if (cancelled) return;
          setHosts(hostsRes.hosts || []);
          if (status?.keys?.carrierFabric) {
            try {
              const subRes = await fetchUnifiCarrierSubscribers();
              if (!cancelled) setSubscribers(subRes.subscribers || []);
            } catch {
              if (!cancelled) setSubscribers([]);
            }
          }
        }
      } catch (err) {
        if (!cancelled) showError(err.message || copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clientId, copy.loadError]);

  useEffect(() => {
    if (!open || !configured || !hostId) {
      setSites([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchUnifiSites(hostId);
        if (cancelled) return;
        setSites(res.sites || []);
      } catch (err) {
        if (!cancelled) {
          setSites([]);
          showError(err.message || copy.loadError);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, configured, hostId, copy.loadError]);

  if (!open) return null;

  const selectedHost = hosts.find(h => String(h.id) === String(hostId));
  const selectedSite = sites.find(s => String(s.id) === String(siteId));
  const selectedSubscriber = subscribers.find(s => String(s.id) === String(subscriberId));
  const canSaveGlobal = Boolean(configured && hostId && siteId) && !saving;
  const currentIsGlobal = Boolean(link?.linked && link?.mappingMode !== "dedicated" && (link?.hostId || link?.siteId));

  const handleSaveGlobal = async () => {
    if (!canSaveGlobal) return;
    setSaving(true);
    try {
      const res = await saveClientUnifiLink(clientId, {
        mappingMode: "global",
        hostId,
        hostName: selectedHost?.name || link?.hostName || null,
        siteId,
        siteName: selectedSite?.name || link?.siteName || null,
        subscriberId: subscriberId || null,
        subscriberName: selectedSubscriber?.name || null
      });
      showSuccess(copy.saveSuccess);
      onSaved?.(res.link);
      onClose?.();
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    setSaving(true);
    try {
      await clearClientUnifiLink(clientId);
      showSuccess(copy.unlinkSuccess);
      onSaved?.(null);
      onClose?.();
    } catch (err) {
      showError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={formStyles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="unifi-site-link-title">
        <div className={unifiStyles.accentBarUnifi} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={`${formStyles.headerIconWrap} ${unifiStyles.headerIconUnifi}`} aria-hidden>
              <Icon icon="simple-icons:ubiquiti" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="unifi-site-link-title">{copy.title}</h2>
              <p className={formStyles.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={formStyles.bodySingle}>
          <div className={formStyles.content}>
            {loading ? (
              <p className={formStyles.sectionDesc}>{copy.loading}</p>
            ) : !configured ? (
              <p className={formStyles.sectionDesc}>{copy.notConfigured}</p>
            ) : (
              <>
                {currentIsGlobal ? (
                  <p className={formStyles.sectionDesc}>
                    {copy.current}: {`${link.siteName || link.siteId || ""}${link.hostName ? ` · ${link.hostName}` : ""}`} · global
                  </p>
                ) : null}
                <p className={formStyles.sectionDesc}>{copy.hintGlobal}</p>
                <div className={formStyles.fieldStack}>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="unifi-link-host">{copy.host}</label>
                    <select
                      id="unifi-link-host"
                      className={formStyles.input}
                      value={hostId}
                      onChange={e => {
                        setHostId(e.target.value);
                        setSiteId("");
                      }}
                      disabled={saving}
                    >
                      <option value="">{copy.selectHost}</option>
                      {hosts.map(h => (
                        <option key={h.id} value={h.id}>{h.name || h.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className={formStyles.field}>
                    <label className={formStyles.label} htmlFor="unifi-link-site">{copy.site}</label>
                    <select
                      id="unifi-link-site"
                      className={formStyles.input}
                      value={siteId}
                      onChange={e => setSiteId(e.target.value)}
                      disabled={saving || !hostId}
                    >
                      <option value="">{copy.selectSite}</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.id}</option>
                      ))}
                    </select>
                  </div>
                  {subscribers.length > 0 ? (
                    <div className={formStyles.field}>
                      <label className={formStyles.label} htmlFor="unifi-link-sub">{copy.subscriber}</label>
                      <select
                        id="unifi-link-sub"
                        className={formStyles.input}
                        value={subscriberId}
                        onChange={e => setSubscriberId(e.target.value)}
                        disabled={saving}
                      >
                        <option value="">{copy.selectSubscriber}</option>
                        {subscribers.map(s => (
                          <option key={s.id} value={s.id}>{s.name || s.id}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{copy.hintGlobal}</span>
          <div className={formStyles.footerActions}>
            {link?.linked ? (
              <button type="button" className={formStyles.ghostBtn} onClick={handleUnlink} disabled={saving}>
                {copy.unlink}
              </button>
            ) : null}
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {copy.cancel}
            </button>
            {configured ? (
              <button type="button" className={formStyles.primaryBtn} onClick={handleSaveGlobal} disabled={!canSaveGlobal}>
                {saving ? copy.saving : copy.save}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
