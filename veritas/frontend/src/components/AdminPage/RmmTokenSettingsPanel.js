import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { deleteRmmTokenSettings, fetchRmmEnrollmentTokens, fetchRmmTokenSettings, fetchRmmTokenSettingsList, updateRmmTokenSettings } from "../../api/rmm";
import { Badge, Btn, Card, Field, FormGrid, Switch, Table } from "./AdminUi";
import { buildOverridesFromForm, COLLECTORS, formStateFromClientSettings } from "./rmmConstants";
import { DEFAULT_METRICS, METRICS_FIELDS } from "./rmmMetricsStorageUtils";
import { formatRmmDateTime, interpolate } from "./adminRmmI18n";
import { RmmClientTimingFields, RmmCollectorsSection, RmmCollectorClientControls, RmmMetricsClientControl, RmmMetricsStorageSection } from "./RmmSettingsBlocks";
import styles from "./AdminRmm.module.css";

function emptyForm(global) {
  return {
    useCustom: false,
    customized: {
      heartbeatIntervalMinutes: false,
      offlineThresholdMinutes: false,
      autoUpdateEnabled: false,
      collectors: Object.fromEntries(COLLECTORS.map(c => [c.key, false])),
      metrics: Object.fromEntries(METRICS_FIELDS.map(f => [f.key, false]))
    },
    values: {
      heartbeatIntervalMinutes: global?.heartbeatIntervalMinutes ?? 5,
      offlineThresholdMinutes: global?.offlineThresholdMinutes ?? 15,
      autoUpdateEnabled: global?.autoUpdateEnabled !== false,
      collectors: {
        ...(global?.collectors || {})
      },
      metrics: {
        ...(global?.metrics || DEFAULT_METRICS)
      }
    },
    global: global || null
  };
}

function formatTokenOptionLabel(token, fallbackLabel) {
  const company = token.client_name || token.clientName || "";
  const label = token.label || fallbackLabel || "";
  const shortId = String(token.id || "").slice(0, 8);
  if (company && label) return `${company} — ${label}`;
  if (company) return `${company} — ${shortId}…`;
  return label || shortId || String(token.id || "");
}

export default function RmmTokenSettingsPanel({
  copy,
  locale = "fr",
  globalSettings,
  isCommunity = false,
  onProClick,
  metricsStorageStats = null,
  activeAgentCount = 0
}) {
  const ts = copy.tokenSettings;
  const [configuredList, setConfiguredList] = useState([]);
  const [tokenOptions, setTokenOptions] = useState([]);
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(globalSettings));

  const loadConfiguredList = useCallback(async () => {
    try {
      const items = await fetchRmmTokenSettingsList();
      setConfiguredList(Array.isArray(items) ? items : []);
    } catch {
      setConfiguredList([]);
    }
  }, []);

  const loadTokenOptions = useCallback(async () => {
    try {
      const items = await fetchRmmEnrollmentTokens(undefined, {
        status: "active"
      });
      setTokenOptions(Array.isArray(items) ? items : []);
    } catch {
      setTokenOptions([]);
    }
  }, []);

  useEffect(() => {
    loadConfiguredList();
    loadTokenOptions();
  }, [loadConfiguredList, loadTokenOptions]);

  const loadTokenSettings = useCallback(async tokenId => {
    if (!tokenId) {
      setForm(emptyForm(globalSettings));
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRmmTokenSettings(tokenId);
      setForm(formStateFromClientSettings(data));
    } catch (err) {
      toast.error(err.message || copy.toast.tokenLoadError);
      setForm(emptyForm(globalSettings));
    } finally {
      setLoading(false);
    }
  }, [globalSettings, copy.toast.tokenLoadError]);

  useEffect(() => {
    loadTokenSettings(selectedTokenId);
  }, [selectedTokenId, loadTokenSettings]);

  const selectedTokenLabel = useMemo(() => {
    const token = tokenOptions.find(t => String(t.id) === String(selectedTokenId));
    if (token) return formatTokenOptionLabel(token, ts.untitledToken);
    const configured = configuredList.find(t => String(t.enrollmentTokenId) === String(selectedTokenId));
    if (configured) {
      return formatTokenOptionLabel({
        id: configured.enrollmentTokenId,
        client_name: configured.clientName,
        label: configured.tokenLabel
      }, ts.untitledToken);
    }
    return "";
  }, [tokenOptions, configuredList, selectedTokenId, ts.untitledToken]);

  const patchCustomized = (path, value) => {
    setForm(prev => {
      if (path.startsWith("collectors.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          customized: {
            ...prev.customized,
            collectors: {
              ...prev.customized.collectors,
              [key]: value
            }
          }
        };
      }
      if (path.startsWith("metrics.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          customized: {
            ...prev.customized,
            metrics: {
              ...prev.customized.metrics,
              [key]: value
            }
          }
        };
      }
      return {
        ...prev,
        customized: {
          ...prev.customized,
          [path]: value
        }
      };
    });
  };

  const patchValue = (path, value) => {
    setForm(prev => {
      if (path.startsWith("collectors.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          values: {
            ...prev.values,
            collectors: {
              ...prev.values.collectors,
              [key]: value
            }
          }
        };
      }
      if (path.startsWith("metrics.")) {
        const key = path.split(".")[1];
        return {
          ...prev,
          values: {
            ...prev.values,
            metrics: {
              ...prev.values.metrics,
              [key]: value
            }
          }
        };
      }
      return {
        ...prev,
        values: {
          ...prev.values,
          [path]: value
        }
      };
    });
  };

  const formatOverridesSummary = (overrides = {}) => {
    const parts = [];
    const o = overrides || {};
    if (o.heartbeatIntervalMinutes != null) parts.push(ts.overrideHeartbeat);
    if (o.offlineThresholdMinutes != null) parts.push(ts.overrideOffline);
    if (o.autoUpdateEnabled !== undefined && o.autoUpdateEnabled !== null) parts.push(ts.overrideAutoUpdate);
    if (o.collectors && Object.keys(o.collectors).length > 0) {
      parts.push(interpolate(ts.overrideCollectors, {
        count: Object.keys(o.collectors).length
      }));
    }
    if (o.metrics && Object.keys(o.metrics).length > 0) {
      parts.push(interpolate(ts.overrideMetrics, {
        count: Object.keys(o.metrics).length
      }));
    }
    return parts.length ? parts.join(", ") : "-";
  };

  const handleSave = async () => {
    if (!selectedTokenId) {
      toast.warn(copy.toast.selectToken);
      return;
    }
    setSaving(true);
    try {
      if (!form.useCustom) {
        await updateRmmTokenSettings(selectedTokenId, {
          useCustom: false
        });
        toast.success(copy.toast.tokenResetGlobal);
      } else {
        const overrides = buildOverridesFromForm(form.global, form);
        if (isCommunity && overrides.collectors) {
          delete overrides.collectors;
        }
        if (Object.keys(overrides).length === 0) {
          toast.warn(copy.toast.tokenNeedOverride);
          setSaving(false);
          return;
        }
        await updateRmmTokenSettings(selectedTokenId, {
          useCustom: true,
          overrides
        });
        toast.success(copy.toast.tokenSaved);
      }
      await loadConfiguredList();
      await loadTokenSettings(selectedTokenId);
    } catch (err) {
      toast.error(err.message || copy.toast.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedTokenId) return;
    setSaving(true);
    try {
      await deleteRmmTokenSettings(selectedTokenId);
      toast.success(copy.toast.tokenReset);
      await loadConfiguredList();
      await loadTokenSettings(selectedTokenId);
    } catch (err) {
      toast.error(err.message || copy.toast.tokenResetError);
    } finally {
      setSaving(false);
    }
  };

  return <>
      <Card title={ts.listTitle} description={ts.listDescription} fill>
        <Table columns={[{
        key: "clientName",
        label: ts.colCompany
      }, {
        key: "tokenLabel",
        label: ts.colToken
      }, {
        key: "summary",
        label: ts.colOverrides,
        render: row => formatOverridesSummary(row.overrides)
      }, {
        key: "updatedAt",
        label: ts.colUpdated,
        render: row => row.updatedAt ? formatRmmDateTime(row.updatedAt, locale) : "-"
      }, {
        key: "actions",
        label: "",
        render: row => <Btn variant="ghost" onClick={() => setSelectedTokenId(String(row.enrollmentTokenId))}>
                  {copy.common.edit}
                </Btn>
      }]} rows={configuredList.map(item => ({
        id: item.enrollmentTokenId,
        enrollmentTokenId: item.enrollmentTokenId,
        clientName: item.clientName || "-",
        tokenLabel: item.tokenLabel || ts.untitledToken,
        overrides: item.overrides,
        updatedAt: item.updatedAt
      }))} emptyMessage={ts.emptyList} />
      </Card>

      <Card title={ts.editorTitle} description={ts.editorDescription}>
        <FormGrid cols={2}>
          <Field label={ts.tokenField}>
            <select className={styles.clientSelect} value={selectedTokenId} onChange={e => setSelectedTokenId(e.target.value)}>
              <option value="">{ts.selectToken}</option>
              {tokenOptions.map(token => <option key={token.id} value={String(token.id)}>
                  {formatTokenOptionLabel(token, ts.untitledToken)}
                </option>)}
            </select>
          </Field>
          <Field label={ts.modeField}>
            <Switch checked={form.useCustom} onChange={checked => setForm(prev => ({
            ...prev,
            useCustom: checked
          }))} label={form.useCustom ? ts.customConfig : ts.useGlobal} disabled={!selectedTokenId || loading} />
          </Field>
        </FormGrid>

        {selectedTokenId ? loading ? <p className={styles.collectorsHint}>{copy.common.loadingShort}</p> : <>
              <p className={styles.clientEditorTitle}>
                <Icon icon="mdi:key-outline" aria-hidden />
                {selectedTokenLabel}
                {form.useCustom ? <Badge variant="warn">{ts.badgeCustom}</Badge> : <Badge variant="muted">{ts.badgeGlobal}</Badge>}
              </p>

              <div className={styles.settingsTopGrid}>
                <section className={styles.settingsSection}>
                  <h3 className={styles.settingsSectionTitle}>{copy.settings.communicationTitle}</h3>
                  <RmmClientTimingFields copy={copy} form={form} disabled={!form.useCustom} onCustomize={(path, value) => patchCustomized(path, value)} onHeartbeatChange={value => patchValue("heartbeatIntervalMinutes", value)} onOfflineChange={value => patchValue("offlineThresholdMinutes", value)} onAutoUpdateChange={value => patchValue("autoUpdateEnabled", value)} />
                  <p className={styles.settingsApplyHint}>{copy.settings.applyHint}</p>
                </section>

                <RmmMetricsStorageSection copy={copy} locale={locale} metrics={form.values.metrics} collectors={form.values.collectors} disabled={!form.useCustom} storageStats={metricsStorageStats} agentCount={activeAgentCount} avgDisksPerAgent={metricsStorageStats?.avgDisksPerAgent ?? 3} renderMetricControl={field => <RmmMetricsClientControl copy={copy} field={field} form={form} disabled={!form.useCustom} onCustomize={(key, value) => patchCustomized(`metrics.${key}`, value)} onValueChange={(key, value) => patchValue(`metrics.${key}`, value)} />} />
              </div>

              <RmmCollectorsSection copy={copy} isCommunity={isCommunity} onProClick={onProClick} hint={copy.collectors.hintClient} disabled={!form.useCustom} renderControls={collector => <RmmCollectorClientControls copy={copy} collector={collector} form={form} disabled={!form.useCustom || isCommunity} onCustomize={(key, value) => patchCustomized(`collectors.${key}`, value)} onValueChange={(key, value) => patchValue(`collectors.${key}`, value)} />} />

              <div className={styles.clientSettingsActions}>
                <Btn onClick={handleSave} disabled={saving}>
                  {saving ? copy.common.saving : copy.common.save}
                </Btn>
                {form.useCustom ? <Btn variant="ghost" onClick={handleReset} disabled={saving}>
                    {ts.resetToGlobal}
                  </Btn> : null}
              </div>
            </> : <p className={styles.collectorsHint}>{ts.pickTokenHint}</p>}
      </Card>
    </>;
}
