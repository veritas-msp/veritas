import { useMemo } from "react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getFormFields } from "./equipmentFormFieldsI18n";
import { getInternetConnectionTypesByCategory } from "./internetConnectionUtils";
import EquipmentModuleTypeTile from "./EquipmentModuleTypeTile";
import { INTERNET_TYPE_ANIMATED } from "./EquipmentHoverIcon";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./InternetConnectionForm.module.css";

export default function InternetTypePicker({
  value = "",
  onChange,
  formCopy: formCopyProp
}) {
  const locale = useAppLocale();
  const formCopy = formCopyProp || getFormFields(locale);
  const categories = useMemo(() => getInternetConnectionTypesByCategory(formCopy), [formCopy]);
  return (
    <div className={styles.typePicker}>
      {categories.map(category => (
        <section key={category.id} className={styles.typeCategory} aria-label={category.label}>
          <h4 className={styles.typeCategoryLabel}>{category.label}</h4>
          <div className={`${formStyles.modulesGrid} ${styles.typeCategoryGrid}`}>
            {category.types.map(entry => (
              <EquipmentModuleTypeTile
                key={entry.id}
                value={entry.id}
                label={entry.label}
                iconify={entry.icon}
                Animated={INTERNET_TYPE_ANIMATED[entry.id]}
                selected={value === entry.id}
                onSelect={onChange}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
