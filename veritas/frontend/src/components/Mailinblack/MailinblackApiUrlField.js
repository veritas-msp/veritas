import { useEffect, useMemo, useState } from "react";
import {
  MAILINBLACK_INSTANCE_REGIONS,
  MAILINBLACK_PARTNER_API_URL,
  buildMailinblackInstanceUrl,
  buildMailinblackUrlFromSlug,
  normalizeMailinblackApiUrl,
  parseMailinblackApiUrl
} from "../../utils/mailinblackUrl";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";

/**
 * Mailinblack API URL picker — partner portal or dedicated instance (region + number).
 *
 * @param {'admin'|'dedicated'} variant
 *   admin: partner vs dedicated choice
 *   dedicated: instance picker only (enterprise tenant)
 */
export default function MailinblackApiUrlField({
  id = "mailinblack-api-url",
  value = "",
  onChange,
  disabled = false,
  variant = "dedicated",
  labels = {}
}) {
  const parsed = useMemo(() => parseMailinblackApiUrl(value), [value]);
  const [urlKind, setUrlKind] = useState(() =>
    variant === "admin" ? (parsed.kind === "partner" ? "partner" : "instance") : "instance"
  );
  const [region, setRegion] = useState(parsed.region || "fr");
  const [instanceNumber, setInstanceNumber] = useState(parsed.number || "");
  const [customSlug, setCustomSlug] = useState(
    parsed.region === "custom" || parsed.kind === "custom" ? parsed.slug || "" : ""
  );

  useEffect(() => {
    const next = parseMailinblackApiUrl(value);
    if (variant === "admin") {
      setUrlKind(next.kind === "partner" ? "partner" : "instance");
    }
    setRegion(next.region || "fr");
    setInstanceNumber(next.number || "");
    if (next.region === "custom" || next.kind === "custom") {
      setCustomSlug(next.slug || value || "");
    }
  }, [value, variant]);

  const emit = nextUrl => {
    onChange?.(normalizeMailinblackApiUrl(nextUrl) || nextUrl?.trim() || "");
  };

  const applyPartner = () => {
    setUrlKind("partner");
    emit(MAILINBLACK_PARTNER_API_URL);
  };

  const applyInstance = (nextRegion, nextNumber, nextSlug) => {
    setUrlKind("instance");
    const r = nextRegion ?? region;
    const n = nextNumber ?? instanceNumber;
    const slug = nextSlug ?? customSlug;
    if (r === "custom") {
      emit(buildMailinblackUrlFromSlug(slug) || slug);
      return;
    }
    const built = buildMailinblackInstanceUrl(r, n);
    if (built) {
      emit(built);
      return;
    }
    emit("");
  };

  const showPartnerChoice = variant === "admin";
  const showInstanceFields = !showPartnerChoice || urlKind === "instance";
  const regionOptions = labels.regions || MAILINBLACK_INSTANCE_REGIONS;

  return (
    <div className={formStyles.fieldStack}>
      {showPartnerChoice ? (
        <div className={formStyles.field}>
          <label className={formStyles.label} htmlFor={`${id}-kind`}>
            {labels.urlKindLabel || "Type d'URL"}
          </label>
          <select
            id={`${id}-kind`}
            className={formStyles.input}
            value={urlKind}
            disabled={disabled}
            onChange={e => {
              const next = e.target.value;
              if (next === "partner") {
                applyPartner();
                return;
              }
              setUrlKind("instance");
              const nextRegion = region === "custom" ? "fr" : region;
              if (region === "custom") setRegion("fr");
              applyInstance(nextRegion, instanceNumber || "", "");
            }}
          >
            <option value="partner">{labels.partnerOption || "Portail partenaire"}</option>
            <option value="instance">{labels.instanceOption || "Instance dédiée"}</option>
          </select>
        </div>
      ) : null}

      {showInstanceFields ? (
        <div className={formStyles.fieldGrid2}>
          <div className={formStyles.field}>
            <label className={formStyles.label} htmlFor={`${id}-region`}>
              {labels.regionLabel || "Région d'instance"}
            </label>
            <select
              id={`${id}-region`}
              className={formStyles.input}
              value={region}
              disabled={disabled}
              onChange={e => {
                const next = e.target.value;
                setRegion(next);
                if (next === "custom") {
                  applyInstance(
                    "custom",
                    "",
                    customSlug || `mibc-fr-${instanceNumber || "XX"}`
                  );
                } else {
                  setCustomSlug("");
                  applyInstance(next, instanceNumber, "");
                }
              }}
            >
              {regionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {region === "custom" ? (
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor={`${id}-slug`}>
                {labels.slugLabel || "Slug d'instance"}
              </label>
              <input
                id={`${id}-slug`}
                type="text"
                className={formStyles.input}
                value={customSlug}
                disabled={disabled}
                placeholder={labels.slugPlaceholder || "mibc-xx-01"}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                onChange={e => {
                  const slug = e.target.value;
                  setCustomSlug(slug);
                  applyInstance("custom", "", slug);
                }}
              />
            </div>
          ) : (
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor={`${id}-number`}>
                {labels.numberLabel || "N° d'instance"}
              </label>
              <input
                id={`${id}-number`}
                type="text"
                inputMode="numeric"
                className={formStyles.input}
                value={instanceNumber}
                disabled={disabled}
                placeholder={labels.numberPlaceholder || "08"}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setInstanceNumber(digits);
                  applyInstance(region, digits, "");
                }}
              />
            </div>
          )}
        </div>
      ) : null}

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor={id}>
          {labels.apiUrlLabel || "URL API Mailinblack"}
        </label>
        <input
          id={id}
          name={id}
          type="text"
          inputMode="url"
          className={formStyles.input}
          value={value || ""}
          disabled={disabled}
          placeholder={
            showPartnerChoice && urlKind === "partner"
              ? MAILINBLACK_PARTNER_API_URL
              : labels.apiUrlPlaceholder || "https://app.mailinblack.com/mibc-XX-YY"
          }
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          onChange={e => {
            const next = e.target.value;
            const parsedNext = parseMailinblackApiUrl(next);
            if (variant === "admin" && parsedNext.kind === "partner") {
              setUrlKind("partner");
            } else if (next.trim()) {
              setUrlKind("instance");
              setRegion(parsedNext.region || "custom");
              setInstanceNumber(parsedNext.number || "");
              if (parsedNext.region === "custom" || parsedNext.kind === "custom") {
                setCustomSlug(parsedNext.slug || next);
              }
            }
            onChange?.(next);
          }}
          onBlur={() => {
            if (value?.trim()) emit(value);
          }}
        />
        {labels.apiUrlHint ? <p className={formStyles.sectionDesc}>{labels.apiUrlHint}</p> : null}
      </div>
    </div>
  );
}
