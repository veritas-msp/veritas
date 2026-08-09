import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchGeneralSettings, updateGeneralSettings } from "../../api/generalSettings";
import { APP_LOCALES, PAGE_SIZE_OPTIONS } from "../../i18n/locales";
import { getLocalizedDateFormatOptions, getLocalizedThemeChoices } from "../../i18n/regionalOptionsI18n";
import { getTimezoneOptions } from "../../i18n/timezoneOptions";
import { getEmployeeRangeOptions } from "../../constants/organizationEmployeeRanges";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAuthContext } from "../../contexts/AuthContext";
import { requestOnboardingRelaunch } from "../Onboarding/onboardingStorage";
import { getAdminGeneralSettingsCopy } from "./adminGeneralSettingsI18n";
import AdminGeneralSettingsEmail from "./AdminGeneralSettingsEmail";
import AdminGeneralSettingsDatabase from "./AdminGeneralSettingsDatabase";
import { Page, Card, Field, Input, Select, Btn, FormGrid, ChoiceGroup, SubTabs } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import s from "./AdminGeneralSettingsPlatform.module.css";
const EMPTY = {
  app_default_locale: "fr",
  app_timezone: "Europe/Paris",
  app_date_format: "dd/mm/yyyy",
  app_organization_name: "Veritas",
  app_default_theme: "light",
  app_default_page_size: "50",
  app_support_email: "",
  app_support_phone: "",
  app_organization_address: "",
  app_organization_website: "",
  app_organization_employee_range: "",
  app_knowledge_base_url: ""
};
export default function AdminGeneralSettings() {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const {
    user
  } = useAuthContext();
  const copy = useMemo(() => getAdminGeneralSettingsCopy(locale), [locale]);
  const dateFormatChoices = useMemo(() => getLocalizedDateFormatOptions(locale), [locale]);
  const themeChoices = useMemo(() => getLocalizedThemeChoices(locale), [locale]);
  const employeeRangeOptions = useMemo(() => getEmployeeRangeOptions(locale), [locale]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const timezoneGroups = useMemo(() => getTimezoneOptions(form.app_timezone).groups, [form.app_timezone]);
  useEffect(() => {
    fetchGeneralSettings().then(data => setForm({
      ...EMPTY,
      ...data
    })).catch(() => toast.error(copy.loadError)).finally(() => setLoading(false));
  }, [copy.loadError]);
  const setField = (key, value) => setForm(prev => ({
    ...prev,
    [key]: value
  }));
  const save = async () => {
    setSaving(true);
    try {
      const {
        settings
      } = await updateGeneralSettings(form);
      const next = {
        ...EMPTY,
        ...(settings || form)
      };
      setForm(next);
      window.dispatchEvent(new CustomEvent("appGeneralSettingsUpdated", {
        detail: next
      }));
      toast.success(copy.saveSuccess);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const relaunchOnboarding = () => {
    requestOnboardingRelaunch(user?.id);
  };
  if (loading) {
    return <Page>
        <p className={adminUi.adminMutedText}>{copy.loading}</p>
      </Page>;
  }
  const subTabs = [{
    key: "general",
    label: copy.tabs.general,
    icon: "mdi:cog-outline"
  }, {
    key: "email",
    label: copy.tabs.email,
    icon: "mdi:email-outline"
  }, {
    key: "database",
    label: copy.tabs.database,
    icon: "mdi:database-outline"
  }];
  if (activeTab === "email") {
    return <Page>
        <SubTabs items={subTabs} active={activeTab} onChange={setActiveTab} fullWidth />
        <AdminGeneralSettingsEmail />
      </Page>;
  }
  if (activeTab === "database") {
    return <Page>
        <SubTabs items={subTabs} active={activeTab} onChange={setActiveTab} fullWidth />
        <AdminGeneralSettingsDatabase />
      </Page>;
  }
  return <Page>
      <SubTabs items={subTabs} active={activeTab} onChange={setActiveTab} fullWidth />

      <FormGrid cols={2} className={s.cardRow}>
        <Card title={copy.localeRegion.title} description={copy.localeRegion.description}>
          <FormGrid cols={1}>
            <Field label={copy.localeRegion.localeLabel} hint={copy.localeRegion.localeHint}>
              <ChoiceGroup variant="locale" ariaLabel={copy.localeRegion.localeAria} value={form.app_default_locale} onChange={value => setField("app_default_locale", value)} options={APP_LOCALES.map(({
              code,
              label,
              flag
            }) => ({
              value: code,
              flag,
              label
            }))} />
            </Field>

            <Field label={copy.localeRegion.timezoneLabel} hint={copy.localeRegion.timezoneHint}>
              <Select value={form.app_timezone} onChange={e => setField("app_timezone", e.target.value)} aria-label={copy.localeRegion.timezoneAria}>
                {timezoneGroups.map(group => <optgroup key={group.offsetLabel} label={group.offsetLabel}>
                    {group.options.map(({
                  value,
                  label
                }) => <option key={value} value={value}>
                        {label}
                      </option>)}
                  </optgroup>)}
              </Select>
            </Field>

            <Field label={copy.localeRegion.dateFormatLabel}>
              <ChoiceGroup variant="pills" ariaLabel={copy.localeRegion.dateFormatAria} value={form.app_date_format} onChange={value => setField("app_date_format", value)} options={dateFormatChoices} />
            </Field>
          </FormGrid>
        </Card>

        <Card title={copy.appearance.title} description={copy.appearance.description}>
          <FormGrid cols={1}>
            <Field label={copy.appearance.themeLabel}>
              <ChoiceGroup variant="theme" ariaLabel={copy.appearance.themeAria} value={form.app_default_theme} onChange={value => setField("app_default_theme", value)} options={themeChoices} />
            </Field>

            <Field label={copy.appearance.pageSizeLabel} hint={copy.appearance.pageSizeHint}>
              <ChoiceGroup variant="segment" ariaLabel={copy.appearance.pageSizeAria} value={form.app_default_page_size} onChange={value => setField("app_default_page_size", value)} options={PAGE_SIZE_OPTIONS.map(({
              value,
              label
            }) => ({
              value,
              label
            }))} />
            </Field>
          </FormGrid>
        </Card>
      </FormGrid>

      <Card title={copy.organization.title} description={copy.organization.description}>
        <FormGrid cols={2}>
          <Field label={copy.organization.nameLabel}>
            <Input value={form.app_organization_name} onChange={e => setField("app_organization_name", e.target.value)} placeholder="Veritas" maxLength={120} />
          </Field>

          <Field label={copy.organization.employeesLabel} hint={copy.organization.employeesHint}>
            <Select value={form.app_organization_employee_range || ""} onChange={e => setField("app_organization_employee_range", e.target.value)}>
              <option value="">{copy.organization.employeesEmpty}</option>
              {employeeRangeOptions.map(({
              value,
              label
            }) => <option key={value} value={value}>
                  {label}
                </option>)}
            </Select>
          </Field>

          <Field label={copy.organization.supportEmailLabel} hint={copy.organization.supportEmailHint}>
            <Input type="email" value={form.app_support_email} onChange={e => setField("app_support_email", e.target.value)} placeholder="support@exemple.fr" />
          </Field>

          <Field label={copy.organization.supportPhoneLabel} hint={copy.organization.supportPhoneHint}>
            <Input type="tel" value={form.app_support_phone} onChange={e => setField("app_support_phone", e.target.value)} placeholder="+33 1 23 45 67 89" maxLength={40} />
          </Field>

          <Field label={copy.organization.addressLabel} hint={copy.organization.addressHint}>
            <Input value={form.app_organization_address} onChange={e => setField("app_organization_address", e.target.value)} placeholder="10 rue Example, 33000 Bordeaux" maxLength={300} />
          </Field>

          <Field label={copy.organization.websiteLabel}>
            <Input type="url" value={form.app_organization_website} onChange={e => setField("app_organization_website", e.target.value)} placeholder="https://www.votre-msp.fr" maxLength={200} />
          </Field>
        </FormGrid>
      </Card>

      <FormGrid cols={2} className={s.cardRow}>
        <Card title={copy.support.title} description={copy.support.description}>
          <FormGrid cols={1}>
            <Field label={copy.support.knowledgeBaseLabel} hint={copy.support.knowledgeBaseHint}>
              <Input type="url" value={form.app_knowledge_base_url} onChange={e => setField("app_knowledge_base_url", e.target.value)} placeholder="https://kb.votre-msp.fr" maxLength={500} />
            </Field>
          </FormGrid>
        </Card>

        <Card title={copy.onboarding.title} description={copy.onboarding.description}>
          <p className={adminUi.adminMutedText} style={{
          margin: "0 0 16px"
        }}>
            {copy.onboarding.body}
          </p>
          <Btn variant="secondary" icon="mdi:book-open-page-variant-outline" onClick={relaunchOnboarding}>
            {copy.onboarding.relaunch}
          </Btn>
        </Card>
      </FormGrid>

      <div className={s.footerBar}>
        <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
          {saving ? common.saving : copy.saveBtn}
        </Btn>
      </div>
    </Page>;
}
