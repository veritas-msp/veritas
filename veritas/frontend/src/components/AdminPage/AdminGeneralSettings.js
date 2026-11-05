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
import AdminGeneralSettingsSmtp from "./AdminGeneralSettingsSmtp";
import AdminGeneralSettingsDatabase from "./AdminGeneralSettingsDatabase";
import SettingsSection from "./AdminGeneralSettingsSection";
import AdminGeneralSettingsLoading from "./AdminGeneralSettingsLoading";
import { Page, Field, Input, Select, Btn, FormGrid, ChoiceGroup } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import { useFinderNavIndicator } from "../UiKit";
import s from "./AdminGeneralSettingsPlatform.module.css";
import { AdminShellTab } from "./AdminPlatformShell";

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
  const { user } = useAuthContext();
  const copy = useMemo(() => getAdminGeneralSettingsCopy(locale), [locale]);
  const dateFormatChoices = useMemo(() => getLocalizedDateFormatOptions(locale), [locale]);
  const themeChoices = useMemo(() => getLocalizedThemeChoices(locale), [locale]);
  const employeeRangeOptions = useMemo(() => getEmployeeRangeOptions(locale), [locale]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("locale");
  const timezoneGroups = useMemo(() => getTimezoneOptions(form.app_timezone).groups, [form.app_timezone]);
  const { trackRef: tabsRef, indicator: tabIndicator } = useFinderNavIndicator([activeTab, locale]);

  useEffect(() => {
    fetchGeneralSettings()
      .then(data => setForm({ ...EMPTY, ...data }))
      .catch(() => toast.error(copy.loadError))
      .finally(() => setLoading(false));
  }, [copy.loadError]);

  const setField = (key, value) =>
    setForm(prev => ({
      ...prev,
      [key]: value
    }));

  const save = async () => {
    setSaving(true);
    try {
      const { settings } = await updateGeneralSettings(form);
      const next = {
        ...EMPTY,
        ...(settings || form)
      };
      setForm(next);
      window.dispatchEvent(
        new CustomEvent("appGeneralSettingsUpdated", {
          detail: next
        })
      );
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

  const subTabs = [
    { key: "locale", label: copy.tabs.locale, icon: "mdi:translate" },
    { key: "appearance", label: copy.tabs.appearance, icon: "mdi:palette-outline" },
    { key: "organization", label: copy.tabs.organization, icon: "mdi:office-building-outline" },
    { key: "support", label: copy.tabs.support, icon: "mdi:book-open-page-variant-outline" },
    { key: "email", label: copy.tabs.email, icon: "mdi:email-outline" },
    { key: "smtp", label: copy.tabs.smtp, icon: "mdi:email-fast-outline" },
    { key: "database", label: copy.tabs.database, icon: "mdi:database-outline" }
  ];

  const saveFooter = (
    <div className={s.footerBar}>
      <Btn icon="mdi:content-save-outline" onClick={save} disabled={saving}>
        {saving ? common.saving : copy.saveBtn}
      </Btn>
    </div>
  );

  return (
    <Page>
      <div className={s.shell} data-page-fill>
        <div
          className={s.tabs}
          ref={tabsRef}
          role="tablist"
          aria-label={subTabs.map(tab => tab.label).join(" / ")}
        >
          {tabIndicator.ready ? (
            <span
              className={s.tabIndicator}
              style={{
                transform: `translate3d(${tabIndicator.left}px, 0, 0)`,
                width: tabIndicator.width,
                height: tabIndicator.height
              }}
              aria-hidden
            />
          ) : null}
          {subTabs.map(item => (
            <AdminShellTab
              key={item.key}
              item={item}
              isActive={activeTab === item.key}
              onSelect={setActiveTab}
              disabled={loading}
            />
          ))}
        </div>

        <div className={s.shellBody}>
          {loading ? (
            <div className={s.shellPane} key={`pane-loading`}>
              <AdminGeneralSettingsLoading message={copy.loading} />
            </div>
          ) : null}

          {!loading && activeTab === "email" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <AdminGeneralSettingsEmail />
            </div>
          ) : null}

          {!loading && activeTab === "smtp" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <AdminGeneralSettingsSmtp />
            </div>
          ) : null}

          {!loading && activeTab === "database" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <AdminGeneralSettingsDatabase />
            </div>
          ) : null}

          {!loading && activeTab === "locale" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <div className={s.sectionRow}>
                <SettingsSection title={copy.localeRegion.languageTitle} description={copy.localeRegion.languageDescription} icon="mdi:translate">
                  <FormGrid cols={1}>
                    <Field label={copy.localeRegion.localeLabel} hint={copy.localeRegion.localeHint}>
                      <ChoiceGroup
                        variant="locale"
                        ariaLabel={copy.localeRegion.localeAria}
                        value={form.app_default_locale}
                        onChange={value => setField("app_default_locale", value)}
                        options={APP_LOCALES.map(({ code, label, flag, flagIcon }) => ({
                          value: code,
                          flag,
                          flagIcon,
                          label
                        }))}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>

                <SettingsSection title={copy.localeRegion.formatsTitle} description={copy.localeRegion.formatsDescription} icon="mdi:calendar-clock">
                  <FormGrid cols={1}>
                    <Field label={copy.localeRegion.timezoneLabel} hint={copy.localeRegion.timezoneHint}>
                      <Select
                        value={form.app_timezone}
                        onChange={e => setField("app_timezone", e.target.value)}
                        aria-label={copy.localeRegion.timezoneAria}
                      >
                        {timezoneGroups.map(group => (
                          <optgroup key={group.offsetLabel} label={group.offsetLabel}>
                            {group.options.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </Select>
                    </Field>

                    <Field label={copy.localeRegion.dateFormatLabel}>
                      <ChoiceGroup
                        variant="pills"
                        ariaLabel={copy.localeRegion.dateFormatAria}
                        value={form.app_date_format}
                        onChange={value => setField("app_date_format", value)}
                        options={dateFormatChoices}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>
              </div>
              {saveFooter}
            </div>
          ) : null}

          {!loading && activeTab === "appearance" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <div className={s.sectionRow}>
                <SettingsSection title={copy.appearance.themeTitle} description={copy.appearance.themeDescription} icon="mdi:palette-outline">
                  <FormGrid cols={1}>
                    <Field label={copy.appearance.themeLabel}>
                      <ChoiceGroup
                        variant="theme"
                        ariaLabel={copy.appearance.themeAria}
                        value={form.app_default_theme}
                        onChange={value => setField("app_default_theme", value)}
                        options={themeChoices}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>

                <SettingsSection title={copy.appearance.pageSizeTitle} description={copy.appearance.pageSizeDescription} icon="mdi:format-list-numbered">
                  <FormGrid cols={1}>
                    <Field label={copy.appearance.pageSizeLabel} hint={copy.appearance.pageSizeHint}>
                      <ChoiceGroup
                        variant="segment"
                        ariaLabel={copy.appearance.pageSizeAria}
                        value={form.app_default_page_size}
                        onChange={value => setField("app_default_page_size", value)}
                        options={PAGE_SIZE_OPTIONS.map(({ value, label }) => ({
                          value,
                          label
                        }))}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>
              </div>
              {saveFooter}
            </div>
          ) : null}

          {!loading && activeTab === "organization" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <div className={s.sectionRow}>
                <SettingsSection title={copy.organization.identityTitle} description={copy.organization.identityDescription} icon="mdi:office-building-outline">
                  <FormGrid cols={1}>
                    <Field label={copy.organization.nameLabel}>
                      <Input
                        value={form.app_organization_name}
                        onChange={e => setField("app_organization_name", e.target.value)}
                        placeholder="Veritas"
                        maxLength={120}
                      />
                    </Field>

                    <Field label={copy.organization.employeesLabel} hint={copy.organization.employeesHint}>
                      <Select
                        value={form.app_organization_employee_range || ""}
                        onChange={e => setField("app_organization_employee_range", e.target.value)}
                      >
                        <option value="">{copy.organization.employeesEmpty}</option>
                        {employeeRangeOptions.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label={copy.organization.addressLabel} hint={copy.organization.addressHint}>
                      <Input
                        value={form.app_organization_address}
                        onChange={e => setField("app_organization_address", e.target.value)}
                        placeholder="10 rue Example, 33000 Bordeaux"
                        maxLength={300}
                      />
                    </Field>

                    <Field label={copy.organization.websiteLabel}>
                      <Input
                        type="url"
                        value={form.app_organization_website}
                        onChange={e => setField("app_organization_website", e.target.value)}
                        placeholder="https://www.votre-msp.fr"
                        maxLength={200}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>

                <SettingsSection title={copy.organization.contactTitle} description={copy.organization.contactDescription} icon="mdi:headset">
                  <FormGrid cols={1}>
                    <Field label={copy.organization.supportEmailLabel} hint={copy.organization.supportEmailHint}>
                      <Input
                        type="email"
                        value={form.app_support_email}
                        onChange={e => setField("app_support_email", e.target.value)}
                        placeholder="support@exemple.fr"
                      />
                    </Field>

                    <Field label={copy.organization.supportPhoneLabel} hint={copy.organization.supportPhoneHint}>
                      <Input
                        type="tel"
                        value={form.app_support_phone}
                        onChange={e => setField("app_support_phone", e.target.value)}
                        placeholder="+33 1 23 45 67 89"
                        maxLength={40}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>
              </div>
              {saveFooter}
            </div>
          ) : null}

          {!loading && activeTab === "support" ? (
            <div className={s.shellPane} key={`pane-${activeTab}`}>
              <div className={s.sectionRow}>
                <SettingsSection title={copy.support.title} description={copy.support.description} icon="mdi:lifebuoy">
                  <FormGrid cols={1}>
                    <Field label={copy.support.knowledgeBaseLabel} hint={copy.support.knowledgeBaseHint}>
                      <Input
                        type="url"
                        value={form.app_knowledge_base_url}
                        onChange={e => setField("app_knowledge_base_url", e.target.value)}
                        placeholder="https://kb.exemple.fr"
                        maxLength={300}
                      />
                    </Field>
                  </FormGrid>
                </SettingsSection>

                <SettingsSection title={copy.onboarding.title} description={copy.onboarding.description} icon="mdi:book-open-page-variant-outline">
                  <p className={adminUi.adminMutedText} style={{ margin: "0 0 16px" }}>
                    {copy.onboarding.body}
                  </p>
                  <Btn variant="secondary" icon="mdi:book-open-page-variant-outline" onClick={relaunchOnboarding}>
                    {copy.onboarding.relaunch}
                  </Btn>
                </SettingsSection>
              </div>
              {saveFooter}
            </div>
          ) : null}
        </div>
      </div>
    </Page>
  );
}
