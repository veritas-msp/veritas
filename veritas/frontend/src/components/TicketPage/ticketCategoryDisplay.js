const FORM_CATEGORY_SLUG_RE = /^(incident|demande|probleme|changement|prestation|installation)-/i;

/**
 * Libellé d’affichage d’une catégorie ticket.
 * Vide / slug technique de formulaire → libellé générique (« À catégoriser »).
 */
export function formatTicketCategoryDisplay(category, {
  emptyLabel = "À catégoriser",
  knownLabels = {},
  catalogNames = null
} = {}) {
  const raw = String(category ?? "").trim();
  if (!raw) return emptyLabel;
  if (knownLabels[raw]) return knownLabels[raw];

  if (catalogNames) {
    const names = catalogNames instanceof Set ? catalogNames : new Set(
      Array.from(catalogNames).map(name => String(name || "").trim()).filter(Boolean)
    );
    if (names.has(raw)) return raw;
    const lower = raw.toLowerCase();
    for (const name of names) {
      if (String(name).toLowerCase() === lower) return name;
    }
  }

  if (FORM_CATEGORY_SLUG_RE.test(raw)) return emptyLabel;
  return raw;
}

/** N’applique le categorySlug formulaire que s’il correspond à une entrée catalogue. */
export function resolveCategoryFromFormSlug(categorySlug, categories = []) {
  const slug = String(categorySlug || "").trim();
  if (!slug) return "";
  const match = (Array.isArray(categories) ? categories : []).find(
    item => item?.enabled !== false && String(item?.name || "").trim() === slug
  );
  return match ? String(match.name).trim() : "";
}

export function isFormCategorySlug(value) {
  return FORM_CATEGORY_SLUG_RE.test(String(value || "").trim());
}
