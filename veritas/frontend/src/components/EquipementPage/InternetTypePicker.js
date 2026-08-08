import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getFormFields } from "./equipmentFormFieldsI18n";
import { getInternetConnectionTypesByCategory } from "./internetConnectionUtils";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./InternetConnectionForm.module.css";
function TypeTile({
  entry,
  selected,
  onChange
}) {
  return <button type="button" className={`${formStyles.moduleTile} ${selected ? formStyles.moduleTileActive : ""}`} onClick={() => onChange?.(entry.id)} aria-pressed={selected}>
      {selected ? <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden /> : null}
      <Icon icon={entry.icon} className={formStyles.moduleTileIcon} aria-hidden />
      <span className={formStyles.moduleTileLabel}>{entry.label}</span>
    </button>;
}
export default function InternetTypePicker({
  value = "",
  onChange,
  formCopy: formCopyProp
}) {
  const locale = useAppLocale();
  const formCopy = formCopyProp || getFormFields(locale);
  const categories = useMemo(() => getInternetConnectionTypesByCategory(formCopy), [formCopy]);
  return <div className={styles.typePicker}>
      {categories.map(category => <section key={category.id} className={styles.typeCategory} aria-label={category.label}>
          <h4 className={styles.typeCategoryLabel}>{category.label}</h4>
          <div className={`${formStyles.modulesGrid} ${styles.typeCategoryGrid}`}>
            {category.types.map(entry => <TypeTile key={entry.id} entry={entry} selected={value === entry.id} onChange={onChange} />)}
          </div>
        </section>)}
    </div>;
}
