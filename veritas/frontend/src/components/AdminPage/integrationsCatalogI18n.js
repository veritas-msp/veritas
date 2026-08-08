import { pickLocaleMessages } from "../../i18n/translate";
import { INTEGRATION_CATEGORIES, INTEGRATIONS_CATALOG } from "./integrationsCatalog";
import { INTEGRATIONS_CATALOG_I18N } from "./integrationsCatalogI18nContent";
export function localizeIntegrationsCatalog(locale) {
  const overlay = pickLocaleMessages(INTEGRATIONS_CATALOG_I18N, locale);
  const categories = INTEGRATION_CATEGORIES.map(category => ({
    ...category,
    label: overlay.categories?.[category.id] || category.label
  }));
  const catalog = INTEGRATIONS_CATALOG.map(item => {
    const descOverlay = overlay.descriptions?.[item.id]?.description;
    const fieldOverlay = overlay.fieldLabels?.[item.id];
    return {
      ...item,
      description: descOverlay || item.description,
      fields: (item.fields || []).map(field => ({
        ...field,
        label: fieldOverlay?.[field.key] || field.label
      }))
    };
  });
  return {
    categories,
    catalog
  };
}
export function groupLocalizedIntegrationsByCategory(catalog, categories, locale = "fr") {
  const collator = new Intl.Collator(locale, {
    sensitivity: "base"
  });
  const isAvailable = item => item.status === "available";
  return categories.map(category => ({
    ...category,
    items: catalog.filter(item => item.category === category.id).sort((a, b) => {
      const aRank = isAvailable(a) ? 0 : 1;
      const bRank = isAvailable(b) ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return collator.compare(a.name, b.name);
    })
  })).filter(section => section.items.length > 0).sort((a, b) => collator.compare(a.label, b.label));
}
