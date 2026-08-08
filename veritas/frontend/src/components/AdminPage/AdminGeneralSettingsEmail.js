import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchSettings, updateSetting } from "../../api/settings";
import API_BASE_URL from "../../config";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getAdminGeneralSettingsCopy } from "./adminGeneralSettingsI18n";
import { Card, Field, Input, Btn, FormGrid, Modal, NumberStepper } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import s from "./AdminGeneralSettingsPlatform.module.css";
const EMAIL_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "BUG_REPORT_EMAIL"];
const EMPTY = {
  SMTP_HOST: "",
  SMTP_PORT: "587",
  SMTP_USER: "",
  SMTP_PASS: "",
  BUG_REPORT_EMAIL: ""
};
export default function AdminGeneralSettingsEmail() {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getAdminGeneralSettingsCopy(locale), [locale]);
  const emailCopy = copy.email;
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    fetchSettings().then(rows => {
      const map = rows.reduce((acc, row) => ({
        ...acc,
        [row.key]: row.value
      }), {});
      setForm({
        ...EMPTY,
        ...map
      });
    }).catch(() => toast.error(emailCopy.loadError)).finally(() => setLoading(false));
  }, [emailCopy.loadError]);
  const setField = (key, value) => setForm(prev => ({
    ...prev,
    [key]: value
  }));
  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(EMAIL_KEYS.map(key => updateSetting(key, form[key] ?? "")));
      toast.success(emailCopy.saveSuccess);
    } catch (err) {
      toast.error(err.message || emailCopy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const testEmail = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/email-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        error: emailCopy.testError,
        details: err.message
      });
    } finally {
      setTesting(false);
    }
  };
  if (loading) {
    return <p className={adminUi.adminMutedText}>{copy.loading}</p>;
  }
  return <>
      <Card title={emailCopy.title} description={emailCopy.description}>
        <FormGrid cols={2}>
          <Field label={emailCopy.hostLabel} hint={emailCopy.hostHint}>
            <Input value={form.SMTP_HOST} onChange={e => setField("SMTP_HOST", e.target.value)} placeholder="smtp.example.com" />
          </Field>
          <Field label={emailCopy.portLabel} hint={emailCopy.portHint}>
            <NumberStepper block value={form.SMTP_PORT || 587} onChange={value => setField("SMTP_PORT", String(value))} min={1} max={65535} ariaLabel={emailCopy.portLabel} />
          </Field>
          <Field label={emailCopy.userLabel} hint={emailCopy.userHint}>
            <Input value={form.SMTP_USER} onChange={e => setField("SMTP_USER", e.target.value)} placeholder="notifications@example.com" />
          </Field>
          <Field label={emailCopy.passLabel} hint={emailCopy.passHint}>
            <Input type="password" value={form.SMTP_PASS} onChange={e => setField("SMTP_PASS", e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={emailCopy.fromLabel} hint={emailCopy.fromHint}>
            <Input type="email" value={form.BUG_REPORT_EMAIL} onChange={e => setField("BUG_REPORT_EMAIL", e.target.value)} placeholder="noreply@example.com" />
          </Field>
        </FormGrid>
      </Card>

      <div className={s.actionsRow}>
        <Btn variant="secondary" icon="mdi:email-send-outline" onClick={testEmail} disabled={saving || testing}>
          {testing ? emailCopy.testing : emailCopy.testBtn}
        </Btn>
        <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving || testing}>
          {saving ? common.saving : emailCopy.saveBtn}
        </Btn>
      </div>

      <Modal open={!!testResult} onClose={() => setTestResult(null)} title={emailCopy.testModalTitle} icon="mdi:email-check-outline" width="480px" footer={<Btn onClick={() => setTestResult(null)}>{common.close}</Btn>}>
        {testResult && <div className={s.testResult}>
            <Icon icon={testResult.success ? "mdi:check-circle" : "mdi:close-circle"} className={s.testIcon} style={{
          color: testResult.success ? "#16a34a" : "#dc2626"
        }} />
            <p className={s.testTitle}>
              {testResult.success ? emailCopy.testSuccess : emailCopy.testFail}
            </p>
            {testResult.message && <p className={s.testMessage}>{testResult.message}</p>}
            {testResult.details && <pre className={s.testDetails}>{testResult.details}</pre>}
            {testResult.emailInfo && <ul className={s.testList}>
                <li>
                  <strong>{emailCopy.testTo}:</strong> {testResult.emailInfo.to}
                </li>
                <li>
                  <strong>{emailCopy.testServer}:</strong> {testResult.emailInfo.smtpHost}:
                  {testResult.emailInfo.smtpPort}
                </li>
              </ul>}
          </div>}
      </Modal>
    </>;
}
