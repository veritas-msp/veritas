import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  BookTextIcon,
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  FileTextIcon,
  LaptopMinimalCheckIcon,
  RadioIcon,
  SearchIcon
} from "../Misc/Sidebar/lucideAnimated";
import styles from "./RapportCreateWizard.module.css";

const REPORT_TYPE_ANIMATED_ICONS = {
  "supervision-etat": RadioIcon,
  intervention: BriefcaseBusinessIcon,
  audit: SearchIcon,
  "cahier-recette": BookTextIcon,
  "activite-mensuelle": CalendarDaysIcon,
  "inventaire-parc": LaptopMinimalCheckIcon
};

function getClientName(client, copy) {
  return client?.name || client?.nom || copy.create.getClientLabel(client?.id);
}

function ReportTypeCard({ type, index, comingSoon, selected, badgeSoon, onPick }) {
  const iconRef = useRef(null);
  const AnimatedIcon = REPORT_TYPE_ANIMATED_ICONS[type.id] || FileTextIcon;

  return (
    <button
      type="button"
      role="listitem"
      className={`${styles.typeCard} ${comingSoon ? styles.typeCardSoon : ""} ${selected ? styles.typeCardSelected : ""}`.trim()}
      style={{ "--card-i": index }}
      disabled={comingSoon}
      aria-disabled={comingSoon || undefined}
      aria-pressed={selected || undefined}
      onClick={() => onPick(type)}
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      {comingSoon ? <span className={styles.typeSoonBadge}>{badgeSoon}</span> : null}
      <span className={styles.typeIcon} aria-hidden>
        <AnimatedIcon ref={iconRef} className={styles.typeIconGlyph} size={28} />
      </span>
      <span className={styles.typeBody}>
        <span className={styles.typeTitle}>{type.title}</span>
        {type.description ? <span className={styles.typeDesc}>{type.description}</span> : null}
      </span>
    </button>
  );
}

function ClientSuggestField({
  copy,
  wizard,
  clients,
  loading,
  selectedClientId,
  onPickClient
}) {
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const sorted = [...clients].sort((left, right) =>
      getClientName(left, copy).localeCompare(getClientName(right, copy), undefined, {
        sensitivity: "base"
      })
    );
    return sorted
      .filter(client => {
        const name = getClientName(client, copy).toLowerCase();
        const number = String(client.client_number || client.clientNumber || "").toLowerCase();
        return name.includes(q) || number.includes(q);
      })
      .slice(0, 8);
  }, [clients, copy, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = client => {
    onPickClient(client);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = event => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const client = suggestions[highlight];
      if (client) pick(client);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showMenu = open && query.trim().length >= 1;

  return (
    <div className={styles.clientSuggest} ref={rootRef}>
      <label className={styles.clientSuggestField} htmlFor="rapport-enterprise-suggest">
        <Icon icon="mdi:magnify" className={styles.clientSuggestIcon} aria-hidden />
        <input
          id="rapport-enterprise-suggest"
          type="text"
          className={styles.clientSuggestInput}
          placeholder={copy.create.enterpriseSearch}
          autoComplete="off"
          autoFocus
          value={query}
          disabled={loading}
          aria-expanded={showMenu}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="rapport-enterprise-suggest-list"
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query ? (
          <button
            type="button"
            className={styles.clientSuggestClear}
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label={wizard.clearSearchAria}
          >
            <Icon icon="mdi:close" aria-hidden />
          </button>
        ) : null}
      </label>

      {showMenu ? (
        <div
          id="rapport-enterprise-suggest-list"
          className={styles.clientSuggestMenu}
          role="listbox"
          aria-label={wizard.clientGridAria}
        >
          {loading ? (
            <div className={styles.clientSuggestEmpty}>{wizard.loadingClients}</div>
          ) : suggestions.length === 0 ? (
            <div className={styles.clientSuggestEmpty}>{copy.create.noEnterprise}</div>
          ) : (
            suggestions.map((client, index) => {
              const name = getClientName(client, copy);
              const clientNumber = client.client_number || client.clientNumber;
              const selected = String(client.id) === String(selectedClientId);
              return (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  aria-selected={selected || highlight === index}
                  className={`${styles.clientSuggestOption} ${highlight === index ? styles.clientSuggestOptionActive : ""} ${selected ? styles.clientSuggestOptionSelected : ""}`.trim()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(client)}
                >
                  <span className={styles.clientSuggestOptionName}>{name}</span>
                  {clientNumber ? <span className={styles.clientSuggestOptionMeta}>{clientNumber}</span> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ReportCreateWizard({
  copy,
  reportTypes,
  clients,
  loading,
  step,
  onStepChange,
  selectedClientId,
  onSelectClient,
  selectedReportTypeId,
  onSelectType,
  onStartReport
}) {
  const selectedType = reportTypes.find(type => type.id === selectedReportTypeId) || null;

  useEffect(() => {
    if (step === "client" && !selectedReportTypeId) onStepChange("type");
  }, [onStepChange, selectedReportTypeId, step]);

  const wizard = copy.wizard;
  const SelectedTypeIcon = selectedType
    ? REPORT_TYPE_ANIMATED_ICONS[selectedType.id] || FileTextIcon
    : null;

  const handlePickType = type => {
    if (type.comingSoon) return;
    onSelectType?.(type.id);
    onStepChange("client");
  };

  const handlePickClient = client => {
    const clientId = String(client.id);
    onSelectClient(clientId);
    if (selectedReportTypeId) onStartReport(selectedReportTypeId, clientId);
  };

  const goBackToType = () => onStepChange("type");

  return (
    <div className={styles.picker} data-guide="report-wizard">
      {step === "type" ? (
        <section key="type" className={`${styles.stage} ${styles.typeStage} ${styles.stageFade}`} data-guide="report-types">
          <header className={styles.typeHero}>
            <h2 className={styles.typeHeroTitle}>
              <span className={styles.typeHeroTitleText}>{wizard.typeTitle}</span>
              {/* Noto Emoji Animation, CC BY 4.0 — https://googlefonts.github.io/noto-emoji-animation/ */}
              <img
                className={styles.typeHeroEmoji}
                src="/assets/emoji/bar-chart.webp"
                alt=""
                draggable={false}
              />
            </h2>
            {wizard.typeHint ? <p className={styles.typeHeroHint}>{wizard.typeHint}</p> : null}
          </header>

          <div className={styles.typeGrid} role="list">
            {reportTypes.map((type, index) => (
              <ReportTypeCard
                key={type.id}
                type={type}
                index={index}
                comingSoon={Boolean(type.comingSoon)}
                selected={type.id === selectedReportTypeId}
                badgeSoon={copy.create.badgeSoon}
                onPick={handlePickType}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === "client" ? (
        <section key="client" className={`${styles.stage} ${styles.typeStage} ${styles.clientStage} ${styles.stageFade}`} data-guide="report-client">
          <header className={styles.typeHero}>
            <h2 className={styles.typeHeroTitle}>
              <span className={styles.typeHeroTitleText}>{wizard.clientTitle}</span>
              {/* Noto Emoji Animation, CC BY 4.0 — https://googlefonts.github.io/noto-emoji-animation/ */}
              <img
                className={styles.typeHeroEmoji}
                src="/assets/emoji/house.webp"
                alt=""
                draggable={false}
              />
            </h2>
            {wizard.clientHint ? <p className={styles.typeHeroHint}>{wizard.clientHint}</p> : null}
            {selectedType && SelectedTypeIcon ? (
              <span className={styles.clientChip}>
                <SelectedTypeIcon className={styles.clientChipIcon} size={16} aria-hidden />
                <span className={styles.clientChipName}>{selectedType.title}</span>
              </span>
            ) : null}
          </header>

          <ClientSuggestField
            copy={copy}
            wizard={wizard}
            clients={clients}
            loading={loading}
            selectedClientId={selectedClientId}
            onPickClient={handlePickClient}
          />

          <button type="button" className={styles.backBtn} onClick={goBackToType}>
            <Icon icon="mdi:arrow-left" aria-hidden />
            {wizard.back}
          </button>
        </section>
      ) : null}
    </div>
  );
}
