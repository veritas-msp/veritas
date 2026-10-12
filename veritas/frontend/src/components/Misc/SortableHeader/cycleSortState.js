/**
 * Cycle de tri en 3 états : 1re direction → opposée → ordre par défaut.
 *
 * @param {object} opts
 * @param {string} opts.column
 * @param {string|null|undefined} opts.sortBy
 * @param {string} [opts.sortDirection]
 * @param {string} opts.defaultSortBy
 * @param {string} [opts.defaultSortDirection="asc"]
 * @param {string} [opts.firstDirection="asc"] direction au 1er clic sur une colonne
 * @param {(column: string) => "asc"|"desc"} [opts.getFirstDirection]
 */
export function cycleSortState({
  column,
  sortBy,
  sortDirection = "asc",
  defaultSortBy,
  defaultSortDirection = "asc",
  firstDirection = "asc",
  getFirstDirection
}) {
  const first =
    typeof getFirstDirection === "function" ? getFirstDirection(column) : firstDirection;
  const opposite = first === "asc" ? "desc" : "asc";
  const atDefault =
    sortBy === defaultSortBy && sortDirection === defaultSortDirection;

  if (sortBy !== column) {
    return { sortBy: column, sortDirection: first };
  }

  // Colonne déjà active sur l'ordre par défaut → passer à l'autre sens
  if (atDefault) {
    const other = defaultSortDirection === "asc" ? "desc" : "asc";
    return { sortBy: column, sortDirection: other };
  }

  if (sortDirection === first) {
    return { sortBy: column, sortDirection: opposite };
  }

  // 3e clic : revenir à l'ordre par défaut de la table
  return {
    sortBy: defaultSortBy,
    sortDirection: defaultSortDirection
  };
}

/** Applique le résultat du cycle via les setters React. */
export function applyCycleSort(setSortBy, setSortDirection, next) {
  setSortBy(next.sortBy);
  setSortDirection(next.sortDirection);
}
