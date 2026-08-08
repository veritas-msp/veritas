import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import styles from "./EditionBadge.module.css";
const EDITION_META = {
  community: {
    label: "Community",
    title: "Veritas Community Edition · open source (AGPL-3.0)"
  },
  pro: {
    label: "Pro",
    title: "Veritas Pro Edition · licence commerciale"
  }
};
export default function EditionBadge({
  variant = "dark",
  className = ""
}) {
  const {
    edition,
    loaded
  } = useVeritasEdition();
  if (!loaded) return null;
  const meta = EDITION_META[edition];
  if (!meta) return null;
  return <span className={`${styles.badge} ${styles[variant]} ${styles[edition]} ${className}`.trim()} title={meta.title}>
      {meta.label}
    </span>;
}
