import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { getCheckMKHostsWithDetails, getCheckMKServices, updateEquipmentCheckMKMapping } from "../../api/equipment";
import { showError, showSuccess } from "../../utils/toast";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import checkmkStyles from "../AdminPage/CheckmkIntegrationModal.module.css";
import { getEquipmentMappingModalCopy, interpolate } from "./equipmentMappingModalI18n";
import styles from "./EquipmentMappingModal.module.css";

const CATEGORY_ORDER = ["Serveurs", "Firewalls", "Routeur", "Switch", "BorneWifi", "Alimentation", "TOIP", "Stockage", "Others"];
const CATEGORY_ALIASES = {
  Servers: "Serveurs",
  Storage: "Stockage",
  Autres: "Others",
  Other: "Others",
  NAS: "Stockage"
};
const CATEGORY_ICONS = {
  Serveurs: "mdi:server",
  Firewalls: "mdi:shield-outline",
  Routeur: "mdi:router-network",
  Switch: "mdi:lan",
  BorneWifi: "mdi:wifi",
  Alimentation: "mdi:battery-charging-outline",
  TOIP: "mdi:phone-in-talk",
  Stockage: "mdi:nas",
  Others: "mdi:server-network"
};
const SECTION_ICONS = {
  host: "mdi:server-network",
  service: "mdi:playlist-check",
  help: "mdi:information-outline"
};

function normalizeCategory(category) {
  const mapped = CATEGORY_ALIASES[category] || category;
  return CATEGORY_ORDER.includes(mapped) ? mapped : "Others";
}

function hostId(host) {
  if (!host) return "";
  return typeof host === "string" ? host : host.id || "";
}

function scoreSuggestion(host, equipmentName, clientName, clientId) {
  const h = hostId(host).toLowerCase();
  const alias = String(host?.alias || host?.title || "").toLowerCase();
  const haystack = `${h} ${alias}`;
  const eq = (equipmentName || "").toLowerCase();
  const cl = (clientName || "").toLowerCase().replace(/\s+/g, "-");
  const cid = String(clientId || "");
  let score = 0;
  if (cid) {
    if (haystack.includes(cid)) score += 40;
    if (h.startsWith(`${cid}-`) || h.startsWith(`client-${cid}`) || h.endsWith(`-${cid}`)) score += 35;
  }
  if (cl) {
    const clientWords = cl.split(/[-_\s]/).filter(w => w.length > 2);
    clientWords.forEach(w => {
      if (haystack.includes(w)) score += 15;
    });
    if (haystack.includes(cl.replace(/-/g, ""))) score += 25;
  }
  if (eq) {
    const eqWords = eq.split(/\s+/).filter(w => w.length > 2);
    eqWords.forEach(w => {
      if (haystack.includes(w)) score += 12;
    });
    if (haystack.includes(eq.replace(/\s+/g, "-"))) score += 30;
  }
  return score;
}

function formatHostMeta(host) {
  const parts = [];
  if (host?.alias && host.alias !== host.id) parts.push(host.alias);
  if (host?.ip) parts.push(host.ip);
  return parts.join(" · ");
}

export default function EquipmentMappingModal({
  isOpen,
  onClose,
  equipment,
  onMappingSaved,
  requireService = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentMappingModalCopy(locale), [locale]);
  const [activeSection, setActiveSection] = useState("host");
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHost, setSelectedHost] = useState("");
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);

  const equipmentName = equipment?.name || equipment?.nom || "";
  const clientName = equipment?.clientName || "";
  const clientId = equipment?.clientId;
  const equipmentType = equipment?.type || "";
  const currentMapping = equipment?.checkmkMapping;
  const initialHost = currentMapping?.checkmk_host_name || "";
  const initialService = currentMapping?.checkmk_service_name || "";
  const typeLabel = copy.typeLabels?.[equipmentType] || equipmentType;

  const hasUnsavedChanges = useMemo(() => {
    if (selectedHost !== initialHost) return true;
    if (requireService && selectedService !== initialService) return true;
    return false;
  }, [selectedHost, initialHost, selectedService, initialService, requireService]);

  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open: isOpen,
    onClose,
    hasUnsavedChanges,
    blocked: saving
  });

  const loadHosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCheckMKHostsWithDetails();
      setHosts(Array.isArray(data) ? data : []);
    } catch {
      showError(copy.loadHostsError);
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadHostsError]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedHost(currentMapping?.checkmk_host_name || "");
    setSelectedService(currentMapping?.checkmk_service_name || "");
    setServiceSearchTerm("");
    setServices([]);
    setSearchTerm("");
    setCategoryFilter(null);
    setActiveSection("host");
  }, [isOpen, equipment?.clientId, equipment?.name, equipment?.id]);

  useEffect(() => {
    if (!isOpen) return;
    loadHosts();
  }, [isOpen, loadHosts]);

  useEffect(() => {
    if (!isOpen || !requireService || !selectedHost) {
      if (!selectedHost) setServices([]);
      return;
    }
    let cancelled = false;
    const serviceToSelect = selectedHost === initialHost ? initialService : "";
    const load = async () => {
      setLoadingServices(true);
      try {
        const data = await getCheckMKServices(selectedHost);
        if (cancelled) return;
        const rawServices = data?.services || [];
        const serviceNames = rawServices.map(service => {
          if (typeof service === "string") return service;
          return service.id || service.title || service.name || "";
        }).filter(Boolean);
        setServices(serviceNames);
        if (serviceToSelect.trim()) {
          const found = serviceNames.find(s => s.toLowerCase() === serviceToSelect.trim().toLowerCase());
          setSelectedService(found || serviceToSelect.trim());
        } else {
          setSelectedService("");
        }
      } catch {
        if (cancelled) return;
        showError(copy.loadServicesError);
        setServices([]);
        setSelectedService("");
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, requireService, selectedHost, initialHost, initialService, copy.loadServicesError]);

  const suggestions = useMemo(() => {
    if (!equipmentName && !clientName && !clientId) return [];
    return [...hosts].map(h => ({
      host: h,
      score: scoreSuggestion(h, equipmentName, clientName, clientId)
    })).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(s => s.host);
  }, [hosts, equipmentName, clientName, clientId]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORY_ORDER.forEach(cat => {
      counts[cat] = 0;
    });
    hosts.forEach(h => {
      const cat = normalizeCategory(h.category);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [hosts]);

  const hostsByCategory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = hosts.filter(h => {
      const haystack = `${h.id || ""} ${h.alias || ""} ${h.title || ""} ${h.ip || ""}`.toLowerCase();
      const matchSearch = !query || haystack.includes(query);
      const matchCat = !categoryFilter || normalizeCategory(h.category) === categoryFilter;
      return matchSearch && matchCat;
    });
    const byCat = {};
    CATEGORY_ORDER.forEach(cat => {
      byCat[cat] = [];
    });
    filtered.forEach(h => {
      byCat[normalizeCategory(h.category)].push(h);
    });
    return byCat;
  }, [hosts, searchTerm, categoryFilter]);

  const visibleCategories = useMemo(
    () => CATEGORY_ORDER.filter(cat => (hostsByCategory[cat] || []).length > 0),
    [hostsByCategory]
  );

  const filteredServices = useMemo(() => {
    const q = serviceSearchTerm.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => s.toLowerCase().includes(q));
  }, [services, serviceSearchTerm]);

  const selectHost = host => {
    const id = hostId(host);
    if (!id) return;
    setSelectedHost(id);
    if (requireService && id !== selectedHost) {
      setSelectedService("");
      setServiceSearchTerm("");
      setActiveSection("service");
    }
  };

  const handleSave = async () => {
    if (!selectedHost.trim()) {
      showError(copy.saveErrorMissingHost);
      setActiveSection("host");
      return;
    }
    if (!clientId || !equipmentName) {
      showError(copy.saveErrorMissingEquipment);
      return;
    }
    if (requireService && !selectedService.trim()) {
      showError(copy.saveErrorMissingService);
      setActiveSection("service");
      return;
    }
    setSaving(true);
    try {
      const mapping = await updateEquipmentCheckMKMapping(clientId, equipmentType, equipmentName, {
        checkmk_host_name: selectedHost.trim(),
        checkmk_site: currentMapping?.checkmk_site || null,
        checkmk_service_name: requireService ? selectedService.trim() : null
      });
      showSuccess(copy.saveSuccess);
      onMappingSaved?.(mapping);
      onClose();
    } catch (err) {
      showError(err.message || copy.saveErrorMissingEquipment);
    } finally {
      setSaving(false);
    }
  };

  const handleClearMapping = async () => {
    if (!clientId || !equipmentName) return;
    setSaving(true);
    try {
      await updateEquipmentCheckMKMapping(clientId, equipmentType, equipmentName, {
        checkmk_host_name: null,
        checkmk_site: null,
        checkmk_service_name: null
      });
      showSuccess(copy.deleteSuccess);
      onMappingSaved?.(null);
      onClose();
    } catch (err) {
      showError(err.message || copy.saveErrorMissingEquipment);
    } finally {
      setSaving(false);
    }
  };

  const sections = useMemo(() => {
    const items = [{
      id: "host",
      label: copy.sections.host.label,
      description: copy.sections.host.description,
      icon: SECTION_ICONS.host
    }];
    if (requireService) {
      items.push({
        id: "service",
        label: copy.sections.service.label,
        description: copy.sections.service.description,
        icon: SECTION_ICONS.service
      });
    }
    items.push({
      id: "help",
      label: copy.sections.help.label,
      description: copy.sections.help.description,
      icon: SECTION_ICONS.help
    });
    return items;
  }, [copy, requireService]);

  const subtitle = useMemo(() => {
    if (equipmentName && typeLabel && clientName) {
      return interpolate(copy.subtitleWithClient, {
        name: equipmentName,
        type: typeLabel,
        client: clientName
      });
    }
    if (equipmentName && typeLabel) {
      return interpolate(copy.subtitleWithMeta, {
        name: equipmentName,
        type: typeLabel
      });
    }
    return interpolate(copy.subtitle, {
      name: equipmentName || "—"
    });
  }, [copy, equipmentName, typeLabel, clientName]);

  const mappingStatus = useMemo(() => {
    if (selectedHost && requireService && selectedService) {
      return interpolate(copy.mappedToService, {
        host: selectedHost,
        service: selectedService
      });
    }
    if (selectedHost) {
      return interpolate(copy.mappedTo, {
        host: selectedHost
      });
    }
    return copy.notMapped;
  }, [copy, selectedHost, selectedService, requireService]);

  const footerHint = !selectedHost.trim()
    ? copy.footerPickHost
    : requireService && !selectedService.trim()
      ? copy.footerPickService
      : hasUnsavedChanges
        ? copy.footerReady
        : copy.footerMapped;

  const canSave = Boolean(selectedHost.trim() && (!requireService || selectedService.trim()) && !saving);
  const helpSteps = requireService ? [copy.helpSteps[0], copy.helpServiceStep, ...copy.helpSteps.slice(1)] : copy.helpSteps;

  const renderHostSection = () => <>
      <div className={`${styles.statusCard} ${selectedHost ? styles.statusCardMapped : ""}`}>
        <div className={styles.statusIcon} aria-hidden>
          <Icon icon={selectedHost ? "simple-icons:checkmk" : "mdi:link-variant-off"} />
        </div>
        <div className={styles.statusBody}>
          <p className={styles.statusLabel}>{selectedHost ? copy.selectedHost : copy.notMapped}</p>
          <p className={styles.statusValue}>{mappingStatus}</p>
          {requireService && selectedService ? <p className={styles.statusMeta}>{selectedService}</p> : null}
        </div>
      </div>

      {suggestions.length > 0 ? <div className={styles.suggestions}>
          <p className={styles.suggestionsLabel}>
            <Icon icon="mdi:lightbulb-on-outline" aria-hidden />
            {copy.suggestions}
          </p>
          <div className={styles.suggestionList}>
            {suggestions.map(host => {
            const id = hostId(host);
            const active = selectedHost === id;
            return <button key={id} type="button" className={`${styles.suggestionChip} ${active ? styles.suggestionChipActive : ""}`} onClick={() => selectHost(host)}>
                  {id}
                  {host.ip ? <span className={styles.suggestionMeta}>{host.ip}</span> : null}
                </button>;
          })}
          </div>
        </div> : null}

      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.hostsHeading}</h3>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
          <input type="search" className={`${formStyles.input} ${styles.searchInput}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={copy.searchHost} disabled={saving} autoComplete="off" />
        </div>
        <button type="button" className={`${formStyles.ghostBtn} ${styles.refreshBtn}`} onClick={loadHosts} disabled={saving || loading} aria-label={copy.refreshAria} title={copy.refresh}>
          <Icon icon={loading ? "mdi:loading" : "mdi:refresh"} className={loading ? formStyles.spinning : ""} aria-hidden />
        </button>
      </div>

      <div className={styles.chips} role="tablist" aria-label={copy.allCategories}>
        <button type="button" className={`${styles.chip} ${categoryFilter == null ? styles.chipActive : ""}`} onClick={() => setCategoryFilter(null)}>
          {copy.allCategories}
          <span className={styles.chipCount}>{hosts.length}</span>
        </button>
        {CATEGORY_ORDER.filter(cat => categoryCounts[cat] > 0).map(cat => <button key={cat} type="button" className={`${styles.chip} ${categoryFilter === cat ? styles.chipActive : ""}`} onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}>
            <Icon icon={CATEGORY_ICONS[cat]} aria-hidden />
            {copy.categories[cat] || cat}
            <span className={styles.chipCount}>{categoryCounts[cat]}</span>
          </button>)}
      </div>

      <div className={styles.list}>
        {loading ? <div className={styles.empty}>
            <Icon icon="mdi:loading" className={`${styles.emptyIcon} ${formStyles.spinning}`} aria-hidden />
            <p className={styles.emptyText}>{copy.loadingHosts}</p>
          </div> : visibleCategories.length === 0 ? <div className={styles.empty}>
            <Icon icon="mdi:server-off" className={styles.emptyIcon} aria-hidden />
            <p className={styles.emptyTitle}>{searchTerm.trim() ? interpolate(copy.noHostsSearch, {
          query: searchTerm.trim()
        }) : copy.noHosts}</p>
          </div> : visibleCategories.map(cat => <div key={cat}>
              <div className={styles.groupHeader}>
                <Icon icon={CATEGORY_ICONS[cat]} aria-hidden />
                {copy.categories[cat] || cat}
                <span>· {hostsByCategory[cat].length}</span>
              </div>
              {hostsByCategory[cat].map(host => {
          const id = hostId(host);
          const selected = selectedHost === id;
          const meta = formatHostMeta(host);
          return <button key={id} type="button" className={`${styles.row} ${selected ? styles.rowSelected : ""}`} onClick={() => selectHost(host)}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{id}</span>
                      {meta ? <span className={styles.rowMeta}>{meta}</span> : null}
                    </span>
                    {selected ? <Icon icon="mdi:check-circle" className={styles.rowCheck} aria-hidden /> : null}
                  </button>;
        })}
            </div>)}
      </div>
    </>;

  const renderServiceSection = () => {
    if (!selectedHost) {
      return <div className={styles.empty}>
          <Icon icon="mdi:server-network-outline" className={styles.emptyIcon} aria-hidden />
          <p className={styles.emptyTitle}>{copy.pickHostFirstTitle}</p>
          <p className={styles.emptyText}>{copy.pickHostFirst}</p>
          <button type="button" className={formStyles.primaryBtn} onClick={() => setActiveSection("host")}>
            {copy.goToHost}
          </button>
        </div>;
    }
    return <>
        <div className={`${styles.statusCard} ${selectedService ? styles.statusCardMapped : ""}`}>
          <div className={styles.statusIcon} aria-hidden>
            <Icon icon={selectedService ? "mdi:playlist-check" : "mdi:playlist-remove"} />
          </div>
          <div className={styles.statusBody}>
            <p className={styles.statusLabel}>{copy.selectedService}</p>
            <p className={styles.statusValue}>{selectedService || copy.footerPickService}</p>
            <p className={styles.statusMeta}>{selectedHost}</p>
          </div>
        </div>

        <div className={formStyles.sectionHead}>
          <h3 className={formStyles.sectionTitle}>{interpolate(copy.servicesHeading, {
            host: selectedHost
          })}</h3>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Icon icon="mdi:magnify" className={styles.searchIcon} aria-hidden />
            <input type="search" className={`${formStyles.input} ${styles.searchInput}`} value={serviceSearchTerm} onChange={e => setServiceSearchTerm(e.target.value)} placeholder={copy.searchService} disabled={saving || loadingServices} autoComplete="off" />
          </div>
        </div>

        <div className={styles.list}>
          {loadingServices ? <div className={styles.empty}>
              <Icon icon="mdi:loading" className={`${styles.emptyIcon} ${formStyles.spinning}`} aria-hidden />
              <p className={styles.emptyText}>{copy.loadingServices}</p>
            </div> : filteredServices.length === 0 ? <div className={styles.empty}>
              <Icon icon="mdi:playlist-remove" className={styles.emptyIcon} aria-hidden />
              <p className={styles.emptyTitle}>{serviceSearchTerm.trim() ? interpolate(copy.noServicesSearch, {
            query: serviceSearchTerm.trim()
          }) : copy.noServices}</p>
            </div> : filteredServices.map(service => {
          const selected = selectedService === service;
          return <button key={service} type="button" className={`${styles.row} ${selected ? styles.rowSelected : ""}`} onClick={() => setSelectedService(service)}>
                  <span className={styles.rowMain}>
                    <span className={styles.rowTitle}>{service}</span>
                  </span>
                  {selected ? <Icon icon="mdi:check-circle" className={styles.rowCheck} aria-hidden /> : null}
                </button>;
        })}
        </div>
      </>;
  };

  const renderHelpSection = () => <>
      <div className={formStyles.sectionHead}>
        <h3 className={formStyles.sectionTitle}>{copy.helpTitle}</h3>
        <p className={formStyles.sectionDesc}>{copy.helpDesc}</p>
      </div>
      <ol className={styles.helpList}>
        {helpSteps.map((step, index) => <li key={step.title} className={styles.helpStep}>
            <span className={styles.helpNum} aria-hidden>{index + 1}</span>
            <div>
              <p className={styles.helpStepTitle}>{step.title}</p>
              <p className={styles.helpStepDesc}>{step.desc}</p>
            </div>
          </li>)}
      </ol>
    </>;

  if (!isOpen) return null;

  return createPortal(<>
      <div className={formStyles.overlay} onClick={saving ? undefined : requestClose} role="presentation">
        <div className={`${formStyles.shell} ${styles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="checkmk-mapping-modal-title">
          <div className={checkmkStyles.accentBarCheckmk} aria-hidden />
          <header className={formStyles.header}>
            <div className={formStyles.headerMain}>
              <div className={`${formStyles.headerIconWrap} ${checkmkStyles.headerIconCheckmk}`} aria-hidden>
                <Icon icon="simple-icons:checkmk" />
              </div>
              <div className={formStyles.headerText}>
                <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
                <h2 className={formStyles.title} id="checkmk-mapping-modal-title">{copy.title}</h2>
                <p className={formStyles.subtitle}>{subtitle}</p>
              </div>
            </div>
            <button type="button" className={formStyles.closeBtn} onClick={requestClose} disabled={saving} aria-label={copy.closeAria}>
              <FaTimes />
            </button>
          </header>

          <div className={formStyles.body}>
            <nav className={formStyles.nav} aria-label={copy.navAria}>
              {sections.map(section => <button key={section.id} type="button" className={`${formStyles.navItem} ${activeSection === section.id ? formStyles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                  <Icon icon={section.icon} className={formStyles.navItemIcon} aria-hidden />
                  <span className={formStyles.navItemText}>
                    <span className={formStyles.navItemLabel}>{section.label}</span>
                    <span className={formStyles.navItemHint}>{section.description}</span>
                  </span>
                </button>)}
            </nav>
            <div className={formStyles.content}>
              {activeSection === "service" && requireService ? renderServiceSection() : activeSection === "help" ? renderHelpSection() : renderHostSection()}
            </div>
          </div>

          <footer className={formStyles.footer}>
            {currentMapping?.checkmk_host_name ? <button type="button" className={formStyles.dangerBtn} onClick={handleClearMapping} disabled={saving}>
                <Icon icon="mdi:link-variant-off" aria-hidden />
                {copy.deleteMapping}
              </button> : <span className={formStyles.footerHint}>{footerHint}</span>}
            <div className={formStyles.footerActions}>
              {currentMapping?.checkmk_host_name ? <span className={formStyles.footerHint}>{footerHint}</span> : null}
              <button type="button" className={formStyles.ghostBtn} onClick={requestClose} disabled={saving}>
                {copy.cancel}
              </button>
              <button type="button" className={formStyles.primaryBtn} onClick={handleSave} disabled={!canSave}>
                <Icon icon={saving ? "mdi:loading" : "mdi:content-save-outline"} className={saving ? formStyles.spinning : ""} aria-hidden />
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </footer>
        </div>
      </div>
      <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, document.getElementById("modal-root") || document.body);
}
