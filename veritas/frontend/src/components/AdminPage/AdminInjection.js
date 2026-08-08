import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { Page, Card, SubTabs, Btn, Pagination } from "./AdminUi";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchClientsList } from "../../api/clients";
import { getAdminInjectionCopy } from "./adminInjectionI18n";
import { getEquipmentInjectionFamilies } from "./adminInjectionEquipmentFields";
import { getInjectionFieldRows, hasInjectionFieldCatalog, FIELDS_GUIDE_UI } from "./adminInjectionFieldCatalog";
import { useContractModuleOptions } from "../../hooks/useContractModuleOptions";
import {
  createDocumentDraft,
  filesFromDataTransfer,
  filesFromFileList,
  guessClientIdFromPath
} from "./adminInjectionDocuments";
import { downloadCsvTemplate, INJECTION_ENTITIES, parseInjectionCsv, runDocumentsInjection, runInjection, createInjectionControl } from "./adminInjectionRunner";
import AdminInjectionDocumentsModal from "./AdminInjectionDocumentsModal";
import { useTablePagination } from "./useTablePagination";
import styles from "./AdminInjection.module.css";

export default function AdminInjection({
  isCommunity = false,
  onRunningChange
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminInjectionCopy(locale), [locale]);
  const equipmentFamilies = useMemo(() => getEquipmentInjectionFamilies(locale), [locale]);
  const { enabledModules } = useContractModuleOptions();
  const [activeView, setActiveView] = useState("companies");
  const [selectedFamilyId, setSelectedFamilyId] = useState("servers");
  const selectedFamily = useMemo(
    () => equipmentFamilies.find(f => f.id === selectedFamilyId) || equipmentFamilies[0] || null,
    [equipmentFamilies, selectedFamilyId]
  );
  const contractOptionKeysNote = useMemo(
    () => enabledModules.map(mod => mod.moduleKey).filter(Boolean).join(", "),
    [enabledModules]
  );
  const fieldGuideRows = useMemo(() => {
    return getInjectionFieldRows(activeView).map(row => {
      if (row.id !== "options") return row;
      return {
        ...row,
        note: contractOptionKeysNote
      };
    });
  }, [activeView, contractOptionKeysNote]);
  const showFieldGuide = hasInjectionFieldCatalog(activeView);
  const [rows, setRows] = useState([]);
  const [csvName, setCsvName] = useState("");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [docDrafts, setDocDrafts] = useState([]);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const csvInputRef = useRef(null);
  const filesInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const draftIdRef = useRef(0);
  const controlRef = useRef(null);

  useEffect(() => {
    onRunningChange?.(running);
    return () => onRunningChange?.(false);
  }, [running, onRunningChange]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, [activeView]);

  const hubViews = useMemo(() => INJECTION_ENTITIES.map(key => ({
    key,
    label: copy.tabs[key],
    proOnly: isCommunity && key === "documents"
  })), [copy.tabs, isCommunity]);

  useEffect(() => {
    setRows([]);
    setCsvName("");
    setProgress(null);
    setReport(null);
    setDocDrafts([]);
    setDocsModalOpen(false);
    setDragOver(false);
    setPaused(false);
    controlRef.current?.cancel?.();
    controlRef.current = null;
    if (csvInputRef.current) csvInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "documents" || isCommunity) return undefined;
    let cancelled = false;
    fetchClientsList()
      .then(list => {
        if (!cancelled) setClients(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeView, isCommunity]);

  const previewPagination = useTablePagination(rows, {
    initialPageSize: 10,
    resetDeps: [activeView, csvName]
  });
  const previewRows = previewPagination.paginatedItems;
  const previewHeaders = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0] || {});
  }, [rows]);

  const onCsvChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseInjectionCsv(file);
      if (!parsed.rows.length) {
        toast.warn(copy.noRows);
        setRows([]);
        setCsvName("");
        return;
      }
      setRows(parsed.rows);
      setCsvName(file.name);
      setReport(null);
      setProgress(null);
    } catch (err) {
      toast.error(err.message || copy.parseError);
    }
  };

  const nextDraftId = () => {
    draftIdRef.current += 1;
    return `doc-${draftIdRef.current}`;
  };

  const mergeDocumentFiles = (incoming, clientList = clients) => {
    if (!incoming?.length) return;
    setDocDrafts(prev => {
      const existingKeys = new Set(
        prev.map(d => `${d.relativePath || d.fileName}::${d.file?.size || 0}::${d.file?.lastModified || 0}`)
      );
      const additions = [];
      for (const file of incoming) {
        const relativePath = file.relativePath || file.webkitRelativePath || file.name;
        const key = `${relativePath}::${file.size || 0}::${file.lastModified || 0}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const draft = createDocumentDraft(file, nextDraftId());
        draft.clientId = guessClientIdFromPath(relativePath, clientList);
        additions.push(draft);
      }
      if (!additions.length) return prev;
      return [...prev, ...additions];
    });
    setDocsModalOpen(true);
    setReport(null);
    setProgress(null);
  };

  const handleDocsFileInput = event => {
    const files = filesFromFileList(event.target.files);
    mergeDocumentFiles(files);
    event.target.value = "";
  };

  const handleDocsDrop = async event => {
    event.preventDefault();
    setDragOver(false);
    if (isCommunity || running) return;
    try {
      const files = await filesFromDataTransfer(event.dataTransfer);
      mergeDocumentFiles(files);
    } catch (err) {
      toast.error(err.message || copy.parseError);
    }
  };

  const handleInject = async () => {
    if (activeView === "documents") {
      toast.warn(copy.docsNeedManage);
      return;
    }
    if (!rows.length) {
      toast.warn(copy.needCsv);
      return;
    }
    const control = createInjectionControl();
    controlRef.current = control;
    setRunning(true);
    setPaused(false);
    setReport(null);
    setProgress({
      current: 0,
      total: rows.length,
      ok: 0,
      failed: 0,
      skipped: 0
    });
    try {
      const result = await runInjection({
        entity: activeView,
        rows,
        onProgress: setProgress,
        messages: copy.errors,
        control
      });
      setReport(result);
      if (result.cancelled) {
        toast.info(copy.injectCancelled);
      } else if (result.aborted || result.failed > 0) {
        toast.error(copy.injectAborted);
      } else {
        toast.success(copy.injectDone);
      }
    } catch (err) {
      toast.error(err.message || copy.injectError);
    } finally {
      controlRef.current = null;
      setPaused(false);
      setRunning(false);
    }
  };

  const handleDocumentsInject = async () => {
    if (isCommunity) {
      toast.error(copy.documentsProOnly);
      return;
    }
    if (!docDrafts.length) {
      toast.warn(copy.docsEmpty);
      return;
    }
    if (docDrafts.some(d => !d.clientId)) {
      toast.warn(copy.docsNeedCompany);
      return;
    }
    const control = createInjectionControl();
    controlRef.current = control;
    setRunning(true);
    setPaused(false);
    setReport(null);
    setProgress({
      current: 0,
      total: docDrafts.length,
      ok: 0,
      failed: 0,
      skipped: 0
    });
    try {
      const result = await runDocumentsInjection({
        drafts: docDrafts,
        onProgress: setProgress,
        messages: copy.errors,
        control
      });
      setReport(result);
      if (result.cancelled) {
        toast.info(copy.injectCancelled);
      } else if (result.aborted || result.failed > 0) {
        toast.error(copy.injectAborted);
      } else {
        toast.success(copy.injectDone);
        setDocDrafts([]);
        setDocsModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || copy.injectError);
    } finally {
      controlRef.current = null;
      setPaused(false);
      setRunning(false);
    }
  };

  const handlePauseInjection = () => {
    controlRef.current?.pause?.();
    setPaused(true);
  };

  const handleResumeInjection = () => {
    controlRef.current?.resume?.();
    setPaused(false);
  };

  const handleCancelInjection = () => {
    controlRef.current?.cancel?.();
    setPaused(false);
  };

  const isDocuments = activeView === "documents";

  return <Page>
      <Card title={copy.title} description={copy.subtitle}>
        <SubTabs items={hubViews} active={activeView} onChange={key => {
        if (running) {
          toast.warn(copy.navBlocked);
          return;
        }
        if (isCommunity && key === "documents") {
          toast.info(copy.documentsProOnly);
          return;
        }
        setActiveView(key);
      }} />

        <div className={styles.panel}>
          {isDocuments ? <p className={styles.columnsHint}>
              <strong>{copy.docsHintTitle}</strong>
              <span>{copy.docsHint}</span>
            </p> : showFieldGuide ? <details className={styles.fieldsGuide}>
              <summary className={styles.fieldsGuideSummary} title={FIELDS_GUIDE_UI.toggle}>
                <Icon icon="mdi:table" className={styles.fieldsGuideSummaryIcon} aria-hidden />
                <span className={styles.fieldsGuideSummaryLabel}>{FIELDS_GUIDE_UI.title}</span>
                <Icon icon="mdi:chevron-down" className={styles.fieldsGuideChevron} aria-hidden />
              </summary>
              <div className={styles.fieldsGuideBody}>
                <div className={styles.fieldsGuideTableWrap}>
                  <table className={styles.fieldsGuideTable}>
                    <thead>
                      <tr>
                        <th>{FIELDS_GUIDE_UI.colField}</th>
                        <th>{FIELDS_GUIDE_UI.colCsv}</th>
                        <th>{FIELDS_GUIDE_UI.colType}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldGuideRows.map(row => <tr key={row.id}>
                          <td>
                            <div className={styles.fieldsGuideField}>
                              {row.label}
                              {row.required ? <span className={styles.fieldsGuideRequired}> · {FIELDS_GUIDE_UI.required}</span> : null}
                            </div>
                            {row.note ? <p className={styles.fieldsGuideNote}>{row.note}</p> : null}
                          </td>
                          <td>
                            <div className={styles.fieldsGuideCsvCodes}>
                              {row.columns.map(col => <code key={col}>{col}</code>)}
                            </div>
                          </td>
                          <td>
                            <span className={styles.fieldsGuideType}>{row.type}</span>
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </details> : <p className={styles.columnsHint}>
              <strong>{copy.columnsTitle}</strong>
              <span>{copy.columns[activeView]}</span>
            </p>}

          {activeView === "equipment" ? <div className={styles.equipmentGuide}>
              <div className={styles.equipmentGuideHeader}>
                <strong>{copy.equipmentGuideTitle}</strong>
                <p>{copy.equipmentGuideIntro}</p>
              </div>

              <div className={styles.equipmentFamilyPicker} role="listbox" aria-label={copy.equipmentGuidePickFamily}>
                {equipmentFamilies.map(family => {
                  const active = selectedFamily?.id === family.id;
                  return <button
                    key={family.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${styles.equipmentFamilyChip} ${active ? styles.equipmentFamilyChipActive : ""}`}
                    onClick={() => setSelectedFamilyId(family.id)}
                  >
                    <Icon icon={family.icon} aria-hidden />
                    <span>{family.label}</span>
                  </button>;
                })}
              </div>

              {selectedFamily ? <div className={styles.equipmentFamilyPanel}>
                  <div className={styles.equipmentFamilyPanelHead}>
                    <div className={styles.equipmentFamilyPanelTitle}>
                      <Icon icon={selectedFamily.icon} aria-hidden />
                      <span>{selectedFamily.label}</span>
                    </div>
                    <span className={styles.equipmentFamilyKey}>
                      {copy.equipmentGuideFamilyKey} <code>{selectedFamily.id}</code>
                    </span>
                  </div>
                  <div className={styles.equipmentFieldsTableWrap}>
                    <table className={styles.equipmentFieldsTable}>
                      <thead>
                        <tr>
                          <th>{copy.equipmentGuideCsvCol}</th>
                          <th>{copy.equipmentGuideMeaning}</th>
                          <th>{copy.equipmentGuideValues}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFamily.fields.map(field => <tr key={field.key}>
                            <td>
                              <code>{field.csvColumn}</code>
                              {field.required ? <span className={styles.equipmentRequired}> · {copy.equipmentGuideRequired}</span> : null}
                            </td>
                            <td>{field.label}</td>
                            <td>{field.values}</td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>
                  {selectedFamily.jsonHint ? <p className={styles.equipmentJsonHint}>
                      <strong>{copy.equipmentGuideJson} :</strong> {selectedFamily.jsonHint}
                    </p> : null}
                </div> : null}
            </div> : null}

          {isDocuments ? <>
              <div
                className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""} ${isCommunity ? styles.dropzoneDisabled : ""}`}
                onDragEnter={e => {
                  e.preventDefault();
                  if (!isCommunity && !running) setDragOver(true);
                }}
                onDragOver={e => {
                  e.preventDefault();
                  if (!isCommunity && !running) setDragOver(true);
                }}
                onDragLeave={e => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={handleDocsDrop}
              >
                <Icon icon="mdi:cloud-upload-outline" className={styles.dropzoneIcon} aria-hidden />
                <p className={styles.dropzoneTitle}>{copy.docsDropTitle}</p>
                <p className={styles.dropzoneHint}>{copy.docsDropHint}</p>
                <div className={styles.dropzoneActions}>
                  <Btn variant="secondary" icon="mdi:file-plus-outline" disabled={running || isCommunity} onClick={() => filesInputRef.current?.click()}>
                    {copy.docsPickFiles}
                  </Btn>
                  <Btn variant="secondary" icon="mdi:folder-open-outline" disabled={running || isCommunity} onClick={() => folderInputRef.current?.click()}>
                    {copy.docsPickFolder}
                  </Btn>
                  {docDrafts.length > 0 ? (
                    <Btn icon="mdi:table-edit" disabled={running || isCommunity} onClick={() => setDocsModalOpen(true)}>
                      {copy.docsManageLabel(docDrafts.length)}
                    </Btn>
                  ) : null}
                </div>
                <input ref={filesInputRef} type="file" multiple hidden onChange={handleDocsFileInput} />
                <input ref={folderInputRef} type="file" multiple webkitdirectory hidden onChange={handleDocsFileInput} />
              </div>
            </> : <div className={styles.actions}>
            <Btn variant="secondary" icon="mdi:download" onClick={() => downloadCsvTemplate(activeView)}>
              {copy.downloadTemplate}
            </Btn>
            <Btn variant="secondary" icon="mdi:file-delimited-outline" onClick={() => csvInputRef.current?.click()} disabled={running}>
              {csvName || copy.pickCsv}
            </Btn>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={onCsvChange} />
            <Btn icon="mdi:database-import" onClick={handleInject} disabled={running || !rows.length}>
              {running ? paused ? copy.paused : copy.injecting : copy.inject}
            </Btn>
            {running ? <>
                {paused ? <Btn variant="secondary" icon="mdi:play" onClick={handleResumeInjection}>
                    {copy.resume}
                  </Btn> : <Btn variant="secondary" icon="mdi:pause" onClick={handlePauseInjection}>
                    {copy.pause}
                  </Btn>}
                <Btn variant="danger" icon="mdi:stop" onClick={handleCancelInjection}>
                  {copy.cancel}
                </Btn>
              </> : null}
          </div>}

          {progress && !docsModalOpen ? (() => {
            const total = Math.max(1, progress.total || (isDocuments ? docDrafts.length : rows.length) || 1);
            const current = Math.min(Math.max(0, progress.current || 0), total);
            const percent = Math.min(100, Math.round(current / total * 100));
            return <div className={styles.progressBlock}>
                <div className={styles.progressMeta}>
                  <p className={styles.progress}>
                    {paused ? `${copy.paused} · ` : null}
                    {copy.progressLabel(current, total)}
                    {" · "}
                    {copy.resultOkLabel(progress.ok || 0)}
                    {" · "}
                    {copy.resultFailedLabel(progress.failed || 0)}
                  </p>
                  <span className={styles.progressPercent}>{percent}%</span>
                </div>
                <div className={`${styles.progressTrack} ${paused ? styles.progressTrackPaused : ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={copy.progressLabel(current, total)}>
                  <div className={`${styles.progressFill} ${paused ? styles.progressFillPaused : ""}`} style={{
                    width: `${percent}%`
                  }} />
                </div>
              </div>;
          })() : null}

          {!isDocuments ? <section className={styles.preview}>
            <h3 className={styles.previewTitle}>{copy.previewTitleLabel(rows.length)}</h3>
            {rows.length === 0 ? <p className={styles.empty}>{copy.previewEmpty}</p> : <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {previewHeaders.map(header => <th key={header}>{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => <tr key={`${previewPagination.page}-${idx}`}>
                          {previewHeaders.map(header => <td key={header}>{String(row[header] ?? "")}</td>)}
                        </tr>)}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={previewPagination.page}
                  totalPages={previewPagination.totalPages}
                  onPageChange={previewPagination.setPage}
                  pageSize={previewPagination.pageSize}
                  onPageSizeChange={previewPagination.setPageSize}
                  rangeLabel={previewPagination.rangeLabel}
                />
              </>}
          </section> : docDrafts.length > 0 && !docsModalOpen ? <section className={styles.preview}>
              <h3 className={styles.previewTitle}>{copy.docsManageLabel(docDrafts.length)}</h3>
              <p className={styles.empty}>{copy.docsReadyHint}</p>
            </section> : null}

          {report ? <section className={styles.report}>
              <h3 className={styles.previewTitle}>{copy.resultTitle}</h3>
              <div className={styles.reportSummary}>
                {report.cancelled ? <span className={styles.err}>{copy.injectCancelled}</span> : report.aborted ? <span className={styles.err}>{copy.injectAborted}</span> : null}
                <span className={styles.ok}>{copy.resultOkLabel(report.ok)}</span>
                <span className={styles.err}>{copy.resultFailedLabel(report.failed)}</span>
                {report.skipped > 0 ? <span>{copy.resultSkippedLabel(report.skipped)}</span> : null}
              </div>
              <ul className={styles.reportList}>
                {report.lines.slice(0, 80).map((item, idx) => <li key={`${item.line}-${idx}`} className={styles[`line_${item.status}`]}>
                    <Icon icon={item.status === "ok" ? "mdi:check-circle-outline" : item.status === "skip" ? "mdi:minus-circle-outline" : "mdi:alert-circle-outline"} />
                    <span>{copy.lineLabel(item.line)}</span>
                    <span>{item.message}</span>
                  </li>)}
              </ul>
            </section> : null}
        </div>
      </Card>

      <AdminInjectionDocumentsModal
        open={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        copy={copy}
        locale={locale}
        drafts={docDrafts}
        onChangeDrafts={setDocDrafts}
        clients={clients}
        running={running}
        paused={paused}
        progress={progress}
        onInject={handleDocumentsInject}
        onPause={handlePauseInjection}
        onResume={handleResumeInjection}
        onCancelInject={handleCancelInjection}
        onAddFiles={() => filesInputRef.current?.click()}
        onAddFolder={() => folderInputRef.current?.click()}
      />
    </Page>;
}
