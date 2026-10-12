import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";
import { Icon } from "@iconify/react";
import { bulkUpdateClients } from "../../api/clients";
import { fetchActiveUsers } from "../../api/users";
import MultiSuggestPicker from "../AdminPage/MultiSuggestPicker";
import IconPicker from "../AdminPage/IconPicker";
import { Switch } from "../AdminPage/AdminUi";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { buildEmptyModulesMap } from "../../constants/contractModules";
import { getLocalizedModuleLabel } from "../../i18n/contractModuleLabels";
import { getEnterprisesPageCopy } from "./enterprisesPageI18n";
import {
  DEFAULT_ENTERPRISE_ICON,
  ENTERPRISE_ICON_CHOICES,
  ENTERPRISE_ICON_COLOR_PRESETS,
  resolveEnterpriseIconColor
} from "./enterpriseIconChoices";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./EnterpriseBulkEditModal.module.css";

function getCommercialUserLabel(user) {
  if (!user) return "";
  return user.username || user.email || user.name || user.nom || "";
}

function buildInitialForm(moduleDefinitions = []) {
  return {
    enableCommercial: false,
    commercialId: "",
    enableDebut: false,
    contratDebut: "",
    enableExpiration: false,
    contratExpiration: "",
    enableModules: false,
    modules: buildEmptyModulesMap(moduleDefinitions),
    enableStatut: false,
    statut: "actif",
    enableIcon: false,
    icon: DEFAULT_ENTERPRISE_ICON,
    iconColor: ENTERPRISE_ICON_COLOR_PRESETS[0]
  };
}

function FieldToggle({
  enabled,
  onToggle,
  label,
  hint,
  children
}) {
  return <section className={styles.fieldCard}>
      <div className={styles.fieldCardHead}>
        <div className={styles.fieldCardText}>
          <div className={styles.fieldCardLabel}>{label}</div>
          {hint ? <p className={styles.fieldCardHint}>{hint}</p> : null}
        </div>
        <Switch checked={enabled} onChange={onToggle} label="" />
      </div>
      {enabled ? <div className={styles.fieldCardBody}>{children}</div> : null}
    </section>;
}

export default function EnterpriseBulkEditModal({
  open,
  onClose,
  clientIds = [],
  onSuccess
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const copy = useMemo(() => getEnterprisesPageCopy(locale), [locale]);
  const bulkCopy = copy.bulkModal;
  const {
    modules: contractModules
  } = useContractModuleOptions();
  const [form, setForm] = useState(() => buildInitialForm());
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset uniquement à l'ouverture : clientIds/[...selectedIds] et contractModules
  // changent souvent de référence côté parent (poll, refetch) et ne doivent pas
  // réinitialiser la saisie en cours.
  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(contractModules));
    setError("");
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadingUsers(true);
    fetchActiveUsers().then(data => {
      if (!cancelled) setUsers(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (!cancelled) setUsers([]);
    }).finally(() => {
      if (!cancelled) setLoadingUsers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const commercialOptions = useMemo(() => users.map(user => ({
    id: user.id,
    label: getCommercialUserLabel(user) || String(user.id),
    hint: user.username && user.email ? `${user.email}${user.profile ? ` · ${user.profile}` : ""}` : user.profile || user.email || ""
  })), [users]);

  const moduleDefs = useMemo(() => (Array.isArray(contractModules) ? contractModules : []).filter(module => module?.enabled !== false), [contractModules]);

  const patchForm = patch => setForm(prev => ({
    ...prev,
    ...patch
  }));

  const validateForm = () => {
    const hasField = form.enableCommercial || form.enableDebut || form.enableExpiration || form.enableModules || form.enableStatut || form.enableIcon;
    if (!hasField) return bulkCopy.validation.noField;
    if (form.enableCommercial && !String(form.commercialId || "").trim()) return bulkCopy.validation.noCommercial;
    if (form.enableIcon && !String(form.icon || "").trim()) return bulkCopy.validation.noIcon;
    return "";
  };

  const buildUpdates = () => {
    const updates = {};
    if (form.enableCommercial) updates.commercialId = String(form.commercialId).trim();
    if (form.enableDebut) updates.contratDebut = form.contratDebut || null;
    if (form.enableExpiration) updates.contratExpiration = form.contratExpiration || null;
    if (form.enableModules) updates.options = {
      ...buildEmptyModulesMap(contractModules),
      ...form.modules
    };
    if (form.enableStatut) updates.statut = form.statut === "inactive" ? "inactive" : "actif";
    if (form.enableIcon) {
      updates.icon = String(form.icon || "").trim() || null;
      updates.iconColor = String(form.iconColor || "").trim() || null;
    }
    return updates;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await bulkUpdateClients({
        clientIds,
        updates: buildUpdates()
      });
      onSuccess?.(result);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || bulkCopy.submitError);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const iconColor = resolveEnterpriseIconColor(form.iconColor);

  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="enterprise-bulk-edit-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:pencil-box-multiple-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{bulkCopy.eyebrow}</p>
              <h2 className={formStyles.title} id="enterprise-bulk-edit-title">{bulkCopy.title}</h2>
              <p className={formStyles.subtitle}>{copy.formatBulkModalSelected(clientIds.length)}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={`${formStyles.body} ${formStyles.bodySingle}`}>
          <div className={`${formStyles.content} ${styles.bulkContent}`}>
            <p className={styles.intro}>{bulkCopy.intro}</p>

            <FieldToggle
              enabled={form.enableCommercial}
              onToggle={on => patchForm({ enableCommercial: on })}
              label={bulkCopy.editCommercial}
              hint={bulkCopy.editCommercialHint}
            >
              <MultiSuggestPicker
                singleSelect
                maxResults={8}
                inputId="enterprise-bulk-commercial"
                placeholder={loadingUsers ? bulkCopy.loadingAgents : bulkCopy.commercialSearchPlaceholder}
                options={commercialOptions}
                selectedIds={form.commercialId ? [form.commercialId] : []}
                emptyHint={bulkCopy.noAgentSelected}
                emptyResultsHint={bulkCopy.noAgentFound}
                onChange={ids => patchForm({ commercialId: ids[0] ? String(ids[0]) : "" })}
              />
            </FieldToggle>

            <FieldToggle
              enabled={form.enableDebut}
              onToggle={on => patchForm({ enableDebut: on })}
              label={bulkCopy.editDebut}
            >
              <input
                type="date"
                className={formStyles.input}
                value={form.contratDebut}
                onChange={e => patchForm({ contratDebut: e.target.value })}
              />
            </FieldToggle>

            <FieldToggle
              enabled={form.enableExpiration}
              onToggle={on => patchForm({ enableExpiration: on })}
              label={bulkCopy.editExpiration}
            >
              <input
                type="date"
                className={formStyles.input}
                value={form.contratExpiration}
                onChange={e => patchForm({ contratExpiration: e.target.value })}
              />
            </FieldToggle>

            <FieldToggle
              enabled={form.enableModules}
              onToggle={on => patchForm({ enableModules: on })}
              label={bulkCopy.editModules}
              hint={bulkCopy.modulesHint}
            >
              <div className={formStyles.modulesGrid}>
                {moduleDefs.map(module => {
                  const key = module.moduleKey;
                  const active = !!form.modules?.[key];
                  return <button
                    key={key}
                    type="button"
                    className={`${formStyles.moduleTile} ${active ? formStyles.moduleTileActive : ""}`}
                    onClick={() => setForm(prev => ({
                      ...prev,
                      modules: {
                        ...prev.modules,
                        [key]: !prev.modules?.[key]
                      }
                    }))}
                    aria-pressed={active}
                  >
                    {active ? <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden /> : null}
                    <Icon icon={module.icon || "mdi:puzzle-outline"} className={formStyles.moduleTileIcon} aria-hidden />
                    <span className={formStyles.moduleTileLabel}>{getLocalizedModuleLabel(contractModules, key, locale)}</span>
                  </button>;
                })}
              </div>
            </FieldToggle>

            <FieldToggle
              enabled={form.enableStatut}
              onToggle={on => patchForm({ enableStatut: on })}
              label={bulkCopy.editStatut}
            >
              <div className={formStyles.modulesGrid}>
                <button
                  type="button"
                  className={`${formStyles.moduleTile} ${form.statut === "actif" ? formStyles.moduleTileActive : ""}`}
                  onClick={() => patchForm({ statut: "actif" })}
                  aria-pressed={form.statut === "actif"}
                >
                  {form.statut === "actif" ? <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden /> : null}
                  <Icon icon="mdi:check-circle-outline" className={formStyles.moduleTileIcon} aria-hidden />
                  <span className={formStyles.moduleTileLabel}>{bulkCopy.statutActive}</span>
                </button>
                <button
                  type="button"
                  className={`${formStyles.moduleTile} ${form.statut === "inactive" ? formStyles.moduleTileActive : ""}`}
                  onClick={() => patchForm({ statut: "inactive" })}
                  aria-pressed={form.statut === "inactive"}
                >
                  {form.statut === "inactive" ? <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden /> : null}
                  <Icon icon="mdi:close-circle-outline" className={formStyles.moduleTileIcon} aria-hidden />
                  <span className={formStyles.moduleTileLabel}>{bulkCopy.statutInactive}</span>
                </button>
              </div>
            </FieldToggle>

            <FieldToggle
              enabled={form.enableIcon}
              onToggle={on => patchForm({ enableIcon: on })}
              label={bulkCopy.editIcon}
              hint={bulkCopy.editIconHint}
            >
              <div className={styles.iconAppearanceRow}>
                <div className={styles.iconPickerBlock}>
                  <span className={formStyles.label}>{bulkCopy.iconLabel}</span>
                  <IconPicker
                    value={form.icon || DEFAULT_ENTERPRISE_ICON}
                    onChange={icon => patchForm({ icon })}
                    choices={ENTERPRISE_ICON_CHOICES}
                    searchable
                    popover
                    bare
                    color={iconColor}
                    searchPlaceholder={bulkCopy.iconSearchPlaceholder}
                    searchAria={bulkCopy.iconSearchAria}
                    clearSearchLabel={bulkCopy.iconClearSearch}
                    changeLabel={bulkCopy.iconChangeLabel}
                    pickerAria={bulkCopy.iconPickerAria}
                  />
                </div>
                <div className={styles.iconColorBlock}>
                  <span className={formStyles.label}>{bulkCopy.iconColor}</span>
                  <div className={styles.iconColorPicker} role="group" aria-label={bulkCopy.iconColorAria}>
                    {ENTERPRISE_ICON_COLOR_PRESETS.map(color => {
                      const selected = iconColor.toLowerCase() === color.toLowerCase();
                      return <button
                        key={color}
                        type="button"
                        className={`${styles.iconColorSwatch} ${selected ? styles.iconColorSwatchActive : ""}`}
                        style={{ "--swatch-color": color }}
                        onClick={() => patchForm({ iconColor: color })}
                        aria-label={`${bulkCopy.iconColor} ${color}`}
                        aria-pressed={selected}
                      />;
                    })}
                    <label className={styles.iconColorCustom} title={bulkCopy.iconColorCustom}>
                      <input
                        type="color"
                        className={styles.iconColorInput}
                        value={iconColor}
                        onChange={e => patchForm({ iconColor: e.target.value })}
                        aria-label={bulkCopy.iconColorCustom}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </FieldToggle>

            {error ? <p className={styles.error}>{error}</p> : null}
          </div>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{bulkCopy.footerHint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={formStyles.primaryBtn} onClick={handleSubmit} disabled={saving || clientIds.length === 0}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
                  {bulkCopy.saving}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {bulkCopy.apply}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
