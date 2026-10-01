import { useMemo } from "react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getLegalIdentifierCopy, normalizeLegalIdentifier } from "../../utils/siret";

export default function SiretInput({
  id,
  value,
  onChange,
  className,
  placeholder,
  ...props
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getLegalIdentifierCopy(locale), [locale]);
  return (
    <input
      id={id}
      type="text"
      autoComplete="off"
      className={className}
      value={value ?? ""}
      onChange={event => onChange(normalizeLegalIdentifier(event.target.value))}
      placeholder={placeholder ?? copy.placeholder}
      {...props}
    />
  );
}
