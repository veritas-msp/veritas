import { useMemo, useState } from "react";
import { getTagChipStyle } from "../EnterprisesPage/clientTagColors";
import tagStyles from "../EnterprisesPage/ClientTagModal.module.css";
import styles from "./knowledgeBase.module.css";

export default function KnowledgeTagPicker({
  catalog = [],
  selectedIds = [],
  selectedTags = [],
  onChange,
  disabled = false,
  placeholder,
  emptyLabel,
  loading = false
}) {
  const [query, setQuery] = useState("");
  const catalogById = useMemo(() => {
    const map = new Map();
    [...catalog, ...selectedTags].forEach(tag => {
      if (tag?.id) map.set(String(tag.id), tag);
    });
    return map;
  }, [catalog, selectedTags]);
  const selected = useMemo(
    () => selectedIds.map(id => catalogById.get(String(id))).filter(Boolean),
    [catalogById, selectedIds]
  );
  const available = useMemo(() => {
    const ids = new Set(selectedIds.map(String));
    const q = query.trim().toLowerCase();
    return catalog
      .filter(tag => !ids.has(String(tag.id)))
      .filter(tag => !q || String(tag.label || "").toLowerCase().includes(q))
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }, [catalog, selectedIds, query]);

  const add = tag => {
    if (disabled) return;
    onChange?.([...selectedIds.map(String), String(tag.id)]);
    setQuery("");
  };

  const remove = id => {
    if (disabled) return;
    onChange?.(selectedIds.map(String).filter(value => value !== String(id)));
  };

  return (
    <div className={styles.tagPicker}>
      <div className={styles.chipList}>
        {selected.map(tag => (
          <span key={tag.id} className={styles.tagChip} style={getTagChipStyle(tag.color)}>
            {tag.label}
            {disabled ? null : (
              <button type="button" onClick={() => remove(tag.id)} aria-label={tag.label}>×</button>
            )}
          </span>
        ))}
      </div>
      {disabled ? null : (
        <>
          <input
            className={styles.search}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          {loading ? (
            <p className={styles.hint}>{emptyLabel}</p>
          ) : available.length === 0 ? (
            <p className={styles.hint}>{emptyLabel}</p>
          ) : (
            <div className={`${tagStyles.existingTags} ${styles.tagCatalog}`}>
              {available.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className={tagStyles.existingTagBtn}
                  style={getTagChipStyle(tag.color)}
                  onClick={() => add(tag)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
