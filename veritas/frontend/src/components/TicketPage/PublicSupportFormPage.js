import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  fetchPublicSupportForm,
  fetchPublicSupportFormCaptcha,
  submitPublicSupportForm
} from "../../api/publicSupportForms";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { isFileField } from "../../utils/salesFormFieldTypes";
import SalesFormFieldsRenderer, {
  buildDynamicFieldLines,
  filterVisibleFields,
  validateDynamicFields
} from "./SalesFormFieldsRenderer";
import styles from "./PublicSupportFormPage.module.css";

function getCopy(locale) {
  if (locale === "en") {
    return {
      eyebrow: "Public support",
      loading: "Loading form…",
      notFound: "This form is unavailable or has been disabled.",
      name: "Your name",
      email: "Email",
      phone: "Phone",
      title: "Subject",
      description: "Description",
      captcha: "Security check",
      refreshCaptcha: "New question",
      submit: "Submit request",
      submitting: "Submitting…",
      successTitle: "Request sent",
      successHint: "Keep these ticket number(s) for follow-up:",
      optional: "optional",
      invalidFields: "Please complete the required fields.",
      captchaRequired: "Please answer the security question."
    };
  }
  return {
    eyebrow: "Support public",
    loading: "Chargement du formulaire…",
    notFound: "Ce formulaire est indisponible ou a été désactivé.",
    name: "Votre nom",
    email: "Email",
    phone: "Téléphone",
    title: "Objet",
    description: "Description",
    captcha: "Vérification de sécurité",
    refreshCaptcha: "Nouvelle question",
    submit: "Envoyer la demande",
    submitting: "Envoi…",
    successTitle: "Demande envoyée",
    successHint: "Conservez ce(s) numéro(s) de ticket pour le suivi :",
    optional: "facultatif",
    invalidFields: "Veuillez renseigner les champs obligatoires.",
    captchaRequired: "Veuillez répondre à la question de sécurité."
  };
}

export default function PublicSupportFormPage() {
  const { slug } = useParams();
  const locale = useAppLocale();
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const publicFields = useMemo(
    () => (Array.isArray(form?.fields) ? form.fields : []).filter(field => field && !isFileField(field)),
    [form]
  );
  const visibleFields = useMemo(() => filterVisibleFields(publicFields, values), [publicFields, values]);

  const loadCaptcha = useCallback(async () => {
    if (!slug) return;
    try {
      const next = await fetchPublicSupportFormCaptcha(slug);
      setCaptcha(next);
      setCaptchaAnswer("");
    } catch (error) {
      setCaptcha(null);
      toast.error(error.message || copy.notFound);
    }
  }, [slug, copy.notFound]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setResult(null);
      try {
        const loaded = await fetchPublicSupportForm(slug);
        if (cancelled) return;
        setForm(loaded || null);
        setValues({});
        if (loaded) await loadCaptcha();
      } catch {
        if (!cancelled) setForm(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, loadCaptcha]);

  const handleSubmit = async event => {
    event.preventDefault();
    if (!form || submitting) return;
    if (!validateDynamicFields(visibleFields, values)) {
      toast.error(copy.invalidFields);
      return;
    }
    if (!captcha?.challengeId || !String(captchaAnswer || "").trim()) {
      toast.error(copy.captchaRequired);
      return;
    }
    const displayValues = Object.fromEntries(visibleFields.map(field => {
      const line = buildDynamicFieldLines([field], values)[0] || "";
      const display = line.includes(": ") ? line.split(": ").slice(1).join(": ") : "";
      return [field.fieldKey, display === "-" ? "" : display];
    }));
    const fieldLabels = Object.fromEntries(
      publicFields
        .filter(field => field?.fieldKey)
        .map(field => [field.fieldKey, String(field.label || "").trim() || field.fieldKey])
    );
    setSubmitting(true);
    try {
      const response = await submitPublicSupportForm(slug, {
        captchaChallengeId: captcha.challengeId,
        captchaAnswer: String(captchaAnswer).trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        values,
        displayValues,
        fieldLabels
      });
      setResult(response);
      toast.success(copy.successTitle);
    } catch (error) {
      toast.error(error.message || copy.notFound);
      await loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.empty}>{copy.loading}</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className={styles.page}>
        <header className={styles.top}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1 className={styles.title}>{copy.notFound}</h1>
        </header>
      </div>
    );
  }

  if (result?.success) {
    const tickets = Array.isArray(result.tickets) ? result.tickets : [];
    return (
      <div className={styles.page}>
        <header className={styles.top}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <h1 className={styles.title}>{copy.successTitle}</h1>
          <p className={styles.meta}>{copy.successHint}</p>
        </header>
        <main className={styles.body}>
          <ul className={styles.ticketList}>
            {tickets.map(ticket => (
              <li key={ticket.id || ticket.ticketNumber}>
                <Icon icon="mdi:ticket-confirmation-outline" aria-hidden />
                <strong>{ticket.ticketNumber || ticket.id}</strong>
                {ticket.title ? <span>{ticket.title}</span> : null}
              </li>
            ))}
          </ul>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <h1 className={styles.title}>
          <Icon icon={form.icon || "mdi:file-document-outline"} aria-hidden />
          {form.label}
        </h1>
        {form.description ? <p className={styles.meta}>{form.description}</p> : null}
      </header>
      <main className={styles.body}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>{copy.name} <em>({copy.optional})</em></span>
              <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className={styles.field}>
              <span>{copy.email} <em>({copy.optional})</em></span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </label>
          </div>
          <label className={styles.field}>
            <span>{copy.phone} <em>({copy.optional})</em></span>
            <input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label className={styles.field}>
            <span>{copy.title} <em>({copy.optional})</em></span>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
          </label>
          <label className={styles.field}>
            <span>{copy.description} <em>({copy.optional})</em></span>
            <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} />
          </label>

          {visibleFields.length > 0 ? (
            <div className={styles.dynamicFields}>
              <SalesFormFieldsRenderer fields={visibleFields} values={values} onChange={setValues} />
            </div>
          ) : null}

          <div className={styles.captchaBox}>
            <div className={styles.captchaHead}>
              <strong>{copy.captcha}</strong>
              <button type="button" className={styles.linkBtn} onClick={loadCaptcha}>
                <Icon icon="mdi:refresh" aria-hidden />
                {copy.refreshCaptcha}
              </button>
            </div>
            <p className={styles.captchaQuestion}>{captcha?.question || "…"}</p>
            <input
              className={styles.captchaInput}
              value={captchaAnswer}
              onChange={e => setCaptchaAnswer(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            <Icon icon={submitting ? "mdi:loading" : "mdi:send-outline"} aria-hidden />
            {submitting ? copy.submitting : copy.submit}
          </button>
        </form>
      </main>
    </div>
  );
}
