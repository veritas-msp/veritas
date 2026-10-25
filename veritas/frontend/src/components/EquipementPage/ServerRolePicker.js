import { useMemo } from "react";
import { Icon } from "@iconify/react";
import RoleTagsSelect from "./RoleTagsSelect";
import { getServerRoleQuickSuggestions, normalizeServerRoles } from "./constants/serverRoleOptions";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./ServerRolePicker.module.css";

function resolveRoleLabel(roleValue, options = []) {
  const match = (options || []).find(entry => {
    if (entry && typeof entry === "object") return entry.value === roleValue;
    return entry === roleValue;
  });
  if (match && typeof match === "object") return match.label || match.value;
  return roleValue;
}

/**
 * Section rôles serveur : suggestions rapides + sélecteur multi (même logique d’ajout/retrait).
 */
export default function ServerRolePicker({
  value = [],
  onChange,
  isVirtual = false,
  groups = [],
  options = [],
  placeholder = "Sélectionner les rôles",
  widgetsCopy = {},
  formCopy = {},
}) {
  const selected = useMemo(() => normalizeServerRoles(value), [value]);
  const suggestions = useMemo(() => getServerRoleQuickSuggestions(isVirtual), [isVirtual]);
  const labelByValue = useMemo(() => {
    const map = new Map();
    (options || []).forEach(entry => {
      if (entry && typeof entry === "object" && entry.value != null) {
        map.set(entry.value, entry.label || entry.value);
      } else if (entry) {
        map.set(String(entry), String(entry));
      }
    });
    return map;
  }, [options]);

  const toggleRole = roleValue => {
    const next = selected.includes(roleValue)
      ? selected.filter(item => item !== roleValue)
      : [...selected, roleValue];
    onChange?.(normalizeServerRoles(next));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.quickBlock}>
        <div className={styles.quickHead}>
          <span className={styles.quickIcon} aria-hidden>
            <Icon icon="mdi:lightning-bolt" width={14} height={14} />
          </span>
          <div className={styles.quickText}>
            <span className={styles.quickTitle}>
              {formCopy.rolesQuickTitle || "Suggestions rapides"}
            </span>
            <span className={styles.quickHint}>
              {isVirtual
                ? (formCopy.rolesQuickHintVirtual || "Rôles fréquents pour une VM — cliquez pour ajouter ou retirer.")
                : (formCopy.rolesQuickHintPhysical || "Rôles fréquents pour un serveur physique — cliquez pour ajouter ou retirer.")}
            </span>
          </div>
        </div>
        <div className={styles.quickGrid} role="group" aria-label={formCopy.rolesQuickTitle || "Suggestions rapides"}>
          {suggestions.map(entry => {
            const active = selected.includes(entry.value);
            const label = labelByValue.get(entry.value) || resolveRoleLabel(entry.value, options);
            return (
              <button
                key={entry.value}
                type="button"
                className={`${styles.quickChip} ${active ? styles.quickChipActive : ""}`}
                onClick={() => toggleRole(entry.value)}
                aria-pressed={active}
                title={label}
              >
                <Icon icon={entry.icon} className={styles.quickChipIcon} aria-hidden />
                <span className={styles.quickChipLabel}>{label}</span>
                {active ? <Icon icon="mdi:check" className={styles.quickChipCheck} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.selectBlock}>
        <label className={formStyles.label}>
          {formCopy.rolesAllLabel || formCopy.roles || "Tous les rôles"}
        </label>
        <p className={styles.selectHint}>
          {formCopy.rolesAllHint || "Recherchez et cumulez plusieurs rôles (annuaire, BDD, web…)."}
        </p>
        <RoleTagsSelect
          groups={groups}
          options={options}
          value={selected}
          onChange={roles => onChange?.(normalizeServerRoles(roles))}
          placeholder={placeholder}
          widgetsCopy={widgetsCopy}
        />
      </div>
    </div>
  );
}
