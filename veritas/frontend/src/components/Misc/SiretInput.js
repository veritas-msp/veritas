import { LEGAL_IDENTIFIER_PLACEHOLDER, normalizeLegalIdentifier } from "../../utils/siret";
export default function SiretInput({
  id,
  value,
  onChange,
  className,
  placeholder = LEGAL_IDENTIFIER_PLACEHOLDER,
  ...props
}) {
  return <input id={id} type="text" autoComplete="off" className={className} value={value ?? ""} onChange={event => onChange(normalizeLegalIdentifier(event.target.value))} placeholder={placeholder} {...props} />;
}
