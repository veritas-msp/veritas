import { Icon } from "@iconify/react";

function sanitizePhoneHref(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

/**
 * Renders a sales/support form field value, with navigation links for
 * contact / client entities and tel/mailto for contact coordinates.
 */
export default function SalesFormFieldValue({
  row,
  onNavigate,
  linkClassName = "",
  linkButtonClassName = "",
  metaClassName = "",
  stackClassName = ""
}) {
  if (!row) return null;

  if (Array.isArray(row.links) && row.links.length > 0) {
    return row.links.map((link, index) => (
      <span key={link.id || `${row.key}-${index}`}>
        {index > 0 ? ", " : null}
        {link.href ? (
          <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClassName || undefined}>
            {link.label}
          </a>
        ) : (
          link.label
        )}
      </span>
    ));
  }

  const fieldType = String(row.fieldType || "").toLowerCase();
  const entityId = row.entityId ? String(row.entityId) : "";
  const label = row.value || "";

  const openEntity = () => {
    if (!onNavigate || !entityId) return;
    if (fieldType === "contact") {
      onNavigate("ContactDetail", { contactId: entityId });
      return;
    }
    if (fieldType === "client") {
      onNavigate("ContratDetail", { clientId: entityId, name: label });
    }
  };

  const isLinkedEntity = (fieldType === "contact" || fieldType === "client") && entityId && typeof onNavigate === "function";
  const phone = fieldType === "contact" ? row.phone : null;
  const email = fieldType === "contact" ? row.email : null;
  const phoneHref = phone ? sanitizePhoneHref(phone) : "";

  if (!isLinkedEntity && !phone && !email) {
    return label;
  }

  return (
    <span className={stackClassName || undefined}>
      {isLinkedEntity ? (
        <button type="button" className={linkButtonClassName || linkClassName || undefined} onClick={openEntity}>
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      {(phone || email) ? (
        <span className={metaClassName || undefined}>
          {phone && phoneHref ? (
            <a href={`tel:${phoneHref}`} className={linkClassName || undefined}>
              <Icon icon="mdi:phone" aria-hidden width={14} height={14} />
              {phone}
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className={linkClassName || undefined}>
              <Icon icon="mdi:email-outline" aria-hidden width={14} height={14} />
              {email}
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
