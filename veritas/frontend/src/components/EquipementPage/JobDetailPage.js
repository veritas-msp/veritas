import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchCyberPageData } from "../../api/clients";
import API_BASE_URL, { withApiQuery } from "../../config";
import { useAppFormatters, useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getBackupJobStatus, getBackupJobStatusLabel, getBackupJobStatusTitle, isBackupJobMapped } from "../CybersecuritePage/backupJobStatusUtils";
import EquipmentMappingModal from "./EquipmentMappingModal";
import HycuJobMappingModal from "../EnterprisesPage/HycuJobMappingModal";
import BackupConfigModal from "../EnterprisesPage/BackupConfigModal";
import SolutionDetailPageLayout from "../EnterprisesPage/SolutionDetailPageLayout";
import { getClientHardwareEquipment } from "../../api/equipment";
import { buildBackupFleetRow, buildBackupInstanceDetailPayload } from "./backupMspUtils";
import { getJobDetailCopy } from "./jobDetailPageI18n";
import { isBackupJobActive, normalizeServeurLieList, pickBackupJobType, pickBackupJobDestination } from "../EnterprisesPage/backupJobUtils";
import SmartTooltip from "../SmartTooltip";
import { uiKitLayoutsStyles as finderKit } from "../UiKit";
import styles from "./JobDetailPage.module.css";

function normalizeEquipLookupName(name) {
  return String(name || "")
    .trim()
    .replace(/^(NAS|SAN|DISQUE|STOR|LUN)-/i, "")
    .toLowerCase();
}

function findHardwareByName(hardwareList, name) {
  const list = Array.isArray(hardwareList) ? hardwareList : [];
  const raw = String(name || "").trim();
  if (!raw) return null;
  const target = normalizeEquipLookupName(raw);
  const rawLower = raw.toLowerCase();
  return (
    list.find(eq => {
      const eqName = String(eq?.name || eq?.nom || "").trim();
      if (!eqName) return false;
      if (eqName.toLowerCase() === rawLower) return true;
      return normalizeEquipLookupName(eqName) === target;
    }) || null
  );
}

function formatRoleLabel(role) {
  if (Array.isArray(role)) return role.filter(Boolean).join(", ");
  return role ? String(role) : "";
}

function cleanHwValue(value) {
  const text = value == null || value === "" ? "" : String(value).trim();
  if (!text || text === "-" || text === "Not defined") return "";
  return text;
}

function HardwareInfoTooltip({
  title,
  equipment,
  rows = [],
  copy,
  headerType
}) {
  const typeValue = cleanHwValue(
    headerType ||
      (equipment
        ? equipment.typeServer ||
          equipment.storageType ||
          (equipment.type === "Servers" || equipment.type === "Serveurs" ? equipment.typeServer : "") ||
          equipment.type ||
          ""
        : "")
  );
  const cpu = cleanHwValue(equipment?.processeur);
  const ram = cleanHwValue(equipment?.memoire);
  const storage = cleanHwValue(equipment?.capacite || equipment?.stockage);
  const resources = [
    cpu ? { key: "cpu", icon: "mdi:cpu-64-bit", label: copy.hw.cpuShort || "vCPU", value: cpu } : null,
    ram ? { key: "ram", icon: "mdi:memory", label: copy.hw.ramShort || "RAM", value: ram } : null,
    storage ? { key: "disk", icon: "mdi:harddisk", label: copy.hw.storageShort || "Stockage", value: storage } : null
  ].filter(Boolean);

  const shownValues = new Set(
    [typeValue, cpu, ram, storage, cleanHwValue(title)]
      .filter(Boolean)
      .map(v => v.toLowerCase())
  );
  const shownLabels = new Set(
    [
      copy.hw?.type,
      copy.hw?.cpu,
      copy.hw?.cpuShort,
      copy.hw?.ram,
      copy.hw?.ramShort,
      copy.hw?.storage,
      copy.hw?.storageShort,
      copy.hw?.capacity,
      copy.fields?.jobType,
      "Type",
      "vCPU",
      "CPU",
      "RAM",
      "Stockage",
      "Capacité"
    ]
      .filter(Boolean)
      .map(v => String(v).toLowerCase())
  );

  const pushUniqueRow = (target, label, value) => {
    const text = cleanHwValue(value);
    if (!text || !label) return;
    const labelKey = String(label).toLowerCase();
    const valueKey = text.toLowerCase();
    if (shownLabels.has(labelKey) || shownValues.has(valueKey)) return;
    if (target.some(row => String(row.label).toLowerCase() === labelKey || String(row.value).toLowerCase() === valueKey)) {
      return;
    }
    target.push({ label, value: text });
  };

  const hwRows = [];
  if (equipment) {
    [
      [copy.hw.ip, equipment.ip],
      [copy.hw.os, equipment.systeme || equipment.ordinateurSysteme],
      [copy.hw.role, formatRoleLabel(equipment.role)],
      [copy.hw.model, equipment.model],
      [copy.hw.manufacturer, equipment.manufacturer],
      [copy.hw.vlan, equipment.vlan],
      [copy.hw.serial, equipment.serial],
      [copy.hw.location, equipment.location]
    ].forEach(([label, value]) => pushUniqueRow(hwRows, label, value));
  }

  const extraRows = [];
  (Array.isArray(rows) ? rows : []).forEach(row => {
    if (!row?.label) return;
    pushUniqueRow(extraRows, row.label, row.value);
  });

  const allRows = [...extraRows, ...hwRows];
  const hasContent = resources.length > 0 || allRows.length > 0;

  return (
    <div className={styles.hwTooltip}>
      <div className={styles.hwTooltipHead}>
        <span className={styles.hwTooltipBadge} aria-hidden>
          <Icon icon="mdi:server" />
        </span>
        <div className={styles.hwTooltipHeadText}>
          <strong className={styles.hwTooltipTitle}>{title}</strong>
          {typeValue ? <span className={styles.hwTooltipType}>{typeValue}</span> : null}
        </div>
      </div>

      {resources.length ? (
        <div className={styles.hwResourceRow} aria-label={copy.hw.resources || "Ressources"}>
          {resources.map(item => (
            <div key={item.key} className={styles.hwResourceChip}>
              <span className={styles.hwResourceIcon} aria-hidden>
                <Icon icon={item.icon} />
              </span>
              <div className={styles.hwResourceText}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasContent ? (
        allRows.length ? (
          <ul className={styles.hwTooltipList}>
            {allRows.map(row => (
              <li key={`${row.label}-${row.value}`}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </li>
            ))}
          </ul>
        ) : null
      ) : (
        <p className={styles.hwTooltipEmpty}>{copy.visual.noHardware}</p>
      )}
    </div>
  );
}

function formatBytesLabel(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 1024) return `${Math.round(n)} o`;
  const units = ["Ko", "Mo", "Go", "To"];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")} ${units[unit]}`;
}

function parseBackupVolume(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.volume,
    payload.backup_size,
    payload.total_size,
    payload.size,
    payload.data_size,
    payload.processed_size,
    payload.last_backup_volume,
    payload.details?.volume,
    payload.details?.size,
    payload.service_info?.size,
    payload.rawData?.volume,
    payload.rawData?.last_backup_volume
  ];
  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    if (typeof raw === "number") {
      const formatted = formatBytesLabel(raw);
      if (formatted) return formatted;
      continue;
    }
    const text = String(raw).trim();
    if (text) return text;
  }
  const output = String(
    payload.output || payload.plugin_output || payload.service_output || payload.details?.plugin_output || ""
  );
  if (output) {
    const patterns = [
      /(?:total|processed|backup|data|transferred|read|write)\s*size\s*[:=]\s*([^\n,;]+)/i,
      /(?:taille|volume)\s*(?:total(?:e)?|sauvegard[ée]|transf[ée]r[ée])?\s*[:=]\s*([^\n,;]+)/i,
      /\bsize\s*[:=]\s*([0-9]+(?:[.,][0-9]+)?\s*(?:b|kb|mb|gb|tb|ko|mo|go|to|kib|mib|gib|tib)?)/i
    ];
    for (const re of patterns) {
      const match = output.match(re);
      if (match?.[1]) return match[1].trim();
    }
  }
  const perf = String(payload.perf_data || payload.perfdata || "");
  if (perf) {
    const keys = ["size", "backup_size", "total_size", "processed_size", "read_size", "write_size", "transferred"];
    for (const key of keys) {
      const match = perf.match(new RegExp(`\\b${key}=([\\d.]+)`, "i"));
      if (match) {
        const formatted = formatBytesLabel(parseFloat(match[1]));
        if (formatted) return formatted;
      }
    }
  }
  if (Array.isArray(payload.metrics)) {
    for (const metric of payload.metrics) {
      const name = String(metric?.name || "").toLowerCase();
      if (!/(size|volume|taille)/i.test(name)) continue;
      const value = metric?.value;
      if (value == null || value === "") continue;
      if (typeof value === "number") {
        const formatted = formatBytesLabel(value);
        if (formatted) return formatted;
      } else {
        return String(value).trim();
      }
    }
  }
  return null;
}

function expandLinkedNames(raw) {
  const values = [];
  const seen = new Set();
  normalizeServeurLieList(raw).forEach(entry => {
    String(entry)
      .split(/[,;|]/)
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(value => {
        const key = value.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        values.push(value);
      });
  });
  return values;
}

function elbowPath(x1, y1, x2, y2) {
  const midX = x1 + (x2 - x1) / 2;
  if (Math.abs(y1 - y2) < 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

function formatDuration(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const totalSec = Math.round(value);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
    const hours = Math.floor(min / 60);
    const remMin = min % 60;
    return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  }
  return String(value);
}

function normalizeIncomingJob(data) {
  if (!data || typeof data !== "object") return null;
  if (data.type === "job" || data.nom || data.jobName) {
    return {
      id: data.id,
      clientId: data.clientId,
      clientName: data.clientName || data.client?.name || "",
      type: "job",
      instanceId: data.instanceId,
      instanceLogiciel: data.instanceLogiciel || data.providerName || "",
      nom: data.nom || data.jobName || data.name || "",
      typeBackup: pickBackupJobType(data),
      regularite: data.regularite || "",
      horaire: data.horaire || "",
      retention: data.retention || "",
      destination: pickBackupJobDestination(data),
      serveurLie: normalizeServeurLieList(data.serveurLie || data.server),
      stockageLie: data.stockageLie || "",
      replicationVers: data.replicationVers || "",
      actif: isBackupJobActive(data),
      isMapped: Boolean(data.isMapped),
      checkmkMapping: data.checkmkMapping || null,
      last_backup_date: data.last_backup_date ?? data.rawData?.last_backup_date ?? null,
      last_backup_start: data.last_backup_start ?? data.lastBackup ?? data.rawData?.last_backup_start ?? null,
      last_backup_duration: data.last_backup_duration ?? data.rawData?.last_backup_duration ?? null,
      rawData: data.rawData || data
    };
  }
  return null;
}

function findJobInCyberData(clients, {
  jobId,
  clientId,
  instanceId,
  nom
}) {
  const list = Array.isArray(clients) ? clients : [];
  for (const client of list) {
    if (clientId != null && String(client.id) !== String(clientId)) continue;
    const instances = client?.equipements?.Sauvegarde?.instances || [];
    for (const instance of instances) {
      if (instanceId != null && String(instance.id) !== String(instanceId)) continue;
      for (const job of instance.jobs || []) {
        const id = job.id || `job-${client.id}-${instance.id}-${job.nom}`;
        const nameMatch = nom && String(job.nom || "").toLowerCase() === String(nom).toLowerCase();
        if (jobId && String(id) === String(jobId) || !jobId && nameMatch) {
          const checkmkMapping = job.checkmk_host_name || job.checkmk_service_name ? {
            checkmk_host_name: job.checkmk_host_name || null,
            checkmk_site: job.checkmk_site || null,
            checkmk_service_name: job.checkmk_service_name || null,
            is_active: true
          } : null;
          return {
            id,
            clientId: client.id,
            clientName: client.name || client.nom || "",
            type: "job",
            instanceId: instance.id,
            instanceLogiciel: instance.logiciel || "",
            nom: job.nom || "",
            typeBackup: pickBackupJobType(job),
            regularite: job.regularite || "",
            horaire: job.horaire || "",
            retention: job.retention || "",
            destination: pickBackupJobDestination(job, instance),
            serveurLie: normalizeServeurLieList(job.serveurLie),
            stockageLie: job.stockageLie || "",
            replicationVers: job.replicationVers || "",
            actif: isBackupJobActive(job),
            isMapped: !!checkmkMapping,
            checkmkMapping,
            last_backup_date: job.last_backup_date ?? null,
            last_backup_start: job.last_backup_start ?? null,
            last_backup_duration: job.last_backup_duration ?? null,
            rawData: job
          };
        }
      }
    }
  }
  return null;
}

function storageIconFor(name) {
  const value = String(name || "").toUpperCase();
  if (value.startsWith("NAS-") || value.includes("NAS")) return "mdi:nas";
  if (value.startsWith("SAN-") || value.includes("SAN")) return "mdi:server-network";
  if (value.startsWith("DISQUE-") || value.includes("DISK")) return "mdi:harddisk";
  if (value.includes("RDX") || value.includes("TAPE")) return "mdi:vhs";
  if (value.includes("DATACENTER") || value.includes("PSI")) return "mdi:cloud-outline";
  return "mdi:database-outline";
}

function displayStorageName(name) {
  return String(name || "").replace(/^(NAS|SAN|DISQUE)-/i, "") || name;
}

function InfoRow({
  label,
  value
}) {
  return <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value ?? "-"}</span>
    </div>;
}

const TopologyNode = React.forwardRef(function TopologyNode(
  {
    icon,
    title,
    subtitle,
    variant = "server",
    pulse = false,
    tooltipContent = null
  },
  ref
) {
  const node = (
    <div
      ref={ref}
      className={`${styles.topoNode} ${styles[`topoNode_${variant}`] || ""} ${pulse ? styles.topoNodePulse : ""}`}
    >
      <div className={styles.topoNodeIcon} aria-hidden>
        <Icon icon={icon} />
      </div>
      <div className={styles.topoNodeBody}>
        <span className={styles.topoNodeTitle}>{title}</span>
        {subtitle ? <span className={styles.topoNodeSubtitle}>{subtitle}</span> : null}
      </div>
    </div>
  );
  if (!tooltipContent) return node;
  return (
    <SmartTooltip
      content={tooltipContent}
      as="div"
      className={styles.topoTooltipWrap}
      tooltipClassName={styles.hwTooltipPortal}
      data-tooltip-position="top"
    >
      {node}
    </SmartTooltip>
  );
});

function JobTopologyVisual({
  job,
  copy,
  jobActive,
  mapped = false,
  status = null,
  lastBackupLabel = "-"
}) {
  const stageRef = useRef(null);
  const jobRef = useRef(null);
  const serverRefs = useRef(new Map());
  const storageRefs = useRef(new Map());
  const [paths, setPaths] = useState([]);
  const [volumeLabel, setVolumeLabel] = useState("-");
  const [hardwareList, setHardwareList] = useState([]);

  const servers = useMemo(() => expandLinkedNames(job?.serveurLie), [job?.serveurLie]);

  const storages = useMemo(() => {
    const values = [];
    const seen = new Set();
    const pushAll = raw => {
      expandLinkedNames(raw).forEach(value => {
        const key = value.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        values.push({ name: value, kind: "storage" });
      });
    };
    pushAll(job?.stockageLie);
    pushAll(job?.destination);
    expandLinkedNames(job?.replicationVers).forEach(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      values.push({ name: value, kind: "replica" });
    });
    return values;
  }, [job?.stockageLie, job?.destination, job?.replicationVers]);

  const hasFlow = servers.length > 0 || storages.length > 0;

  const setServerRef = useCallback((name, node) => {
    if (node) serverRefs.current.set(name, node);
    else serverRefs.current.delete(name);
  }, []);

  const setStorageRef = useCallback((name, node) => {
    if (node) storageRefs.current.set(name, node);
    else storageRefs.current.delete(name);
  }, []);

  const measurePaths = useCallback(() => {
    const stage = stageRef.current;
    const jobNode = jobRef.current;
    if (!stage || !jobNode) {
      setPaths([]);
      return;
    }
    const stageBox = stage.getBoundingClientRect();
    const jobBox = jobNode.getBoundingClientRect();
    const jobLeft = {
      x: jobBox.left - stageBox.left,
      y: jobBox.top - stageBox.top + jobBox.height / 2
    };
    const jobRight = {
      x: jobBox.right - stageBox.left,
      y: jobBox.top - stageBox.top + jobBox.height / 2
    };

    const next = [];
    servers.forEach((name, index) => {
      const el = serverRefs.current.get(name);
      if (!el) return;
      const box = el.getBoundingClientRect();
      next.push({
        key: `s-${name}`,
        d: elbowPath(
          box.right - stageBox.left,
          box.top - stageBox.top + box.height / 2,
          jobLeft.x,
          jobLeft.y
        ),
        delay: index * 0.18,
        kind: "backup"
      });
    });
    storages.forEach((item, index) => {
      const el = storageRefs.current.get(item.name);
      if (!el) return;
      const box = el.getBoundingClientRect();
      next.push({
        key: `t-${item.name}`,
        d: elbowPath(
          jobRight.x,
          jobRight.y,
          box.left - stageBox.left,
          box.top - stageBox.top + box.height / 2
        ),
        delay: index * 0.18,
        kind: item.kind === "replica" ? "replica" : "storage"
      });
    });
    setPaths(next);
  }, [servers, storages]);

  useLayoutEffect(() => {
    measurePaths();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measurePaths);
      return () => window.removeEventListener("resize", measurePaths);
    }
    const observer = new ResizeObserver(() => measurePaths());
    observer.observe(stage);
    window.addEventListener("resize", measurePaths);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measurePaths);
    };
  }, [measurePaths]);

  useEffect(() => {
    let cancelled = false;
    if (!job?.clientId) {
      setHardwareList([]);
      return undefined;
    }
    getClientHardwareEquipment(job.clientId)
      .then(list => {
        if (!cancelled) setHardwareList(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setHardwareList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [job?.clientId]);

  useEffect(() => {
    let cancelled = false;
    const localVolume = parseBackupVolume(job) || parseBackupVolume(job?.rawData);
    if (localVolume) {
      setVolumeLabel(localVolume);
    } else {
      setVolumeLabel("-");
    }
    if (!mapped) return undefined;
    const host =
      job?.checkmkMapping?.checkmk_host_name ||
      job?.checkmk_host_name ||
      null;
    const service =
      job?.checkmkMapping?.checkmk_service_name ||
      job?.checkmk_service_name ||
      null;
    const site =
      job?.checkmkMapping?.checkmk_site ||
      job?.checkmk_site ||
      null;
    if (!host || !service) return undefined;

    (async () => {
      try {
        const url = withApiQuery(
          `${API_BASE_URL}/checkmk/service-data/${encodeURIComponent(host)}/${encodeURIComponent(service)}`,
          { site: site || undefined }
        );
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const parsed = parseBackupVolume(data);
        if (!cancelled && parsed) setVolumeLabel(parsed);
      } catch {
        /* keep local / fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapped, job]);

  return (
    <section className={styles.visualPanel} aria-label={copy.visual.title}>
      <div className={styles.visualHeader}>
        <h2 className={styles.visualTitle}>{copy.visual.title}</h2>
        <p className={styles.visualHint}>{copy.visual.hint}</p>
      </div>

      {mapped ? (
        <div className={styles.flowStats} aria-label={copy.visual.statsTitle}>
          <div className={styles.flowStat}>
            <span className={styles.flowStatLabel}>{copy.fields.status}</span>
            <span className={`${styles.statusBadge} ${styles[`status_${status}`] || ""}`} title={getBackupJobStatusTitle(status)}>
              {getBackupJobStatusLabel(status)}
            </span>
          </div>
          <div className={styles.flowStat}>
            <span className={styles.flowStatLabel}>{copy.fields.lastBackup}</span>
            <strong className={styles.flowStatValue}>{lastBackupLabel || "-"}</strong>
          </div>
          <div className={styles.flowStat}>
            <span className={styles.flowStatLabel}>{copy.fields.volume}</span>
            <strong className={styles.flowStatValue}>{volumeLabel || "-"}</strong>
          </div>
        </div>
      ) : null}

      {!hasFlow ? (
        <div className={styles.visualEmpty}>
          <Icon icon="mdi:lan-pending" aria-hidden />
          <p>{copy.visual.empty}</p>
        </div>
      ) : (
        <div className={styles.topologyStage} ref={stageRef}>
          <svg className={styles.topologySvg} aria-hidden>
            {paths.map(path => (
              <g key={path.key}>
                <path
                  className={`${styles.topoPath} ${styles[`topoPath_${path.kind}`] || ""} ${
                    jobActive ? styles.topoPathActive : ""
                  }`}
                  d={path.d}
                  style={{ animationDelay: `${path.delay}s` }}
                />
                {jobActive ? (
                  <circle className={`${styles.topoPacket} ${styles[`topoPacket_${path.kind}`] || ""}`} r="3.5">
                    <animateMotion dur="2.2s" begin={`${path.delay}s`} repeatCount="indefinite" path={path.d} />
                  </circle>
                ) : null}
              </g>
            ))}
          </svg>

          <div className={styles.topology}>
            <div className={styles.topoColumn}>
              <span className={styles.topoColumnLabel}>{copy.visual.servers}</span>
              <div className={styles.topoColumnStack}>
                {servers.length ? (
                  servers.map(name => {
                    const equipment = findHardwareByName(hardwareList, name);
                    return (
                      <TopologyNode
                        key={name}
                        ref={node => setServerRef(name, node)}
                        variant="server"
                        icon="mdi:server"
                        title={name}
                        subtitle={copy.visual.sourceServer}
                        tooltipContent={
                          <HardwareInfoTooltip title={name} equipment={equipment} copy={copy} />
                        }
                      />
                    );
                  })
                ) : (
                  <TopologyNode variant="server" icon="mdi:server-off" title={copy.visual.noServer} subtitle="—" />
                )}
              </div>
            </div>

            <div className={styles.topoColumn}>
              <span className={styles.topoColumnLabel}>{copy.visual.job}</span>
              <div className={styles.topoColumnStack}>
                <TopologyNode
                  ref={jobRef}
                  variant="job"
                  icon="mdi:backup-restore"
                  title={job?.nom || "-"}
                  subtitle={job?.typeBackup || copy.visual.job}
                  pulse={jobActive}
                  tooltipContent={
                    <HardwareInfoTooltip
                      title={job?.nom || copy.visual.job}
                      headerType={job?.typeBackup || ""}
                      copy={copy}
                      rows={[
                        { label: copy.fields.status, value: getBackupJobStatusLabel(status) },
                        { label: copy.fields.lastBackup, value: lastBackupLabel || "" },
                        { label: copy.fields.regularity, value: job?.regularite || "" },
                        { label: copy.fields.schedule, value: job?.horaire || "" },
                        { label: copy.fields.retention, value: job?.retention || "" }
                      ]}
                    />
                  }
                />
              </div>
            </div>

            <div className={styles.topoColumn}>
              <span className={styles.topoColumnLabel}>{copy.visual.storage}</span>
              <div className={styles.topoColumnStack}>
                {storages.length ? (
                  storages.map(item => {
                    const equipment = findHardwareByName(hardwareList, item.name);
                    return (
                      <TopologyNode
                        key={item.name}
                        ref={node => setStorageRef(item.name, node)}
                        variant={item.kind === "replica" ? "replica" : "storage"}
                        icon={storageIconFor(item.name)}
                        title={displayStorageName(item.name)}
                        subtitle={item.kind === "replica" ? copy.fields.replication : item.name}
                        tooltipContent={
                          <HardwareInfoTooltip
                            title={displayStorageName(item.name)}
                            equipment={equipment}
                            copy={copy}
                            rows={
                              item.kind === "replica"
                                ? [{ label: copy.fields.replication, value: item.name }]
                                : []
                            }
                          />
                        }
                      />
                    );
                  })
                ) : (
                  <TopologyNode variant="storage" icon="mdi:database-off-outline" title={copy.visual.noStorage} subtitle="—" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function JobDetailPage({
  jobData,
  onNavigate,
  onUpdate
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getJobDetailCopy(locale), [locale]);
  const {
    formatDateTime
  } = useAppFormatters();
  const [job, setJob] = useState(() => normalizeIncomingJob(jobData));
  const [loading, setLoading] = useState(!normalizeIncomingJob(jobData)?.nom);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const refreshFromApi = useCallback(async () => {
    const seed = normalizeIncomingJob(jobData);
    if (!seed?.id && !seed?.clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCyberPageData();
      const clients = Array.isArray(data?.clients) ? data.clients : Array.isArray(data) ? data : [];
      const found = findJobInCyberData(clients, {
        jobId: seed.id,
        clientId: seed.clientId,
        instanceId: seed.instanceId,
        nom: seed.nom
      });
      if (found) {
        setJob(found);
        onUpdate?.(found);
      } else if (seed?.nom) {
        setJob(seed);
      } else {
        setJob(null);
      }
    } catch {
      if (seed?.nom) setJob(seed);
    } finally {
      setLoading(false);
    }
  }, [jobData, onUpdate]);
  useEffect(() => {
    const normalized = normalizeIncomingJob(jobData);
    setJob(normalized);
    if (!normalized?.nom || !normalized?.instanceLogiciel) {
      refreshFromApi();
    } else {
      setLoading(false);
    }
  }, [jobData, refreshFromApi]);
  useEffect(() => {
    if (!window.updateTabTitle || !job) return;
    window.updateTabTitle("JobDetail", {
      id: job.id,
      clientId: job.clientId,
      clientName: job.clientName,
      name: job.nom,
      nom: job.nom
    });
  }, [job]);
  const fleetRow = useMemo(() => job ? buildBackupFleetRow(job) : null, [job]);
  const status = job ? getBackupJobStatus(job) : null;
  const jobActive = job ? isBackupJobActive(job) : true;
  const mapped = job ? isBackupJobMapped(job) : false;
  const isHycuInstance = /hycu/i.test(String(job?.instanceLogiciel || ""));
  const canMap = Boolean(job?.id);
  const handleOpenClient = () => {
    if (!job?.clientId || !onNavigate) return;
    onNavigate("ContratDetail", {
      clientId: job.clientId,
      name: job.clientName
    });
  };
  const handleBack = () => {
    if (!onNavigate) return;
    if (job?.instanceId != null || job?.clientId != null) {
      onNavigate("InstanceDetail", buildBackupInstanceDetailPayload(job));
      return;
    }
    onNavigate("Hardware");
  };
  const handleMappingSaved = mapping => {
    setJob(prev => {
      if (!prev) return prev;
      const isHycuSave = Boolean(mapping && ("hycu_job_uuid" in mapping || mapping.hycuMapping));
      const next = isHycuSave
        ? {
            ...prev,
            checkmkMapping: null,
            checkmk_host_name: null,
            checkmk_site: null,
            checkmk_service_name: null,
            hycu_job_uuid: mapping?.hycu_job_uuid || null,
            hycu_job_name: mapping?.hycu_job_name || null,
            hycuMapping: mapping?.hycuMapping || (mapping?.hycu_job_uuid ? {
              is_active: true,
              hycu_job_uuid: mapping.hycu_job_uuid,
              hycu_job_name: mapping.hycu_job_name || null
            } : null),
            isMapped: !!(mapping && mapping.hycu_job_uuid)
          }
        : {
            ...prev,
            checkmkMapping: mapping || null,
            checkmk_host_name: mapping?.checkmk_host_name || null,
            checkmk_site: mapping?.checkmk_site || null,
            checkmk_service_name: mapping?.checkmk_service_name || null,
            hycu_job_uuid: null,
            hycu_job_name: null,
            hycuMapping: null,
            isMapped: !!(mapping && mapping.checkmk_host_name && mapping.is_active !== false)
          };
      onUpdate?.(next);
      return next;
    });
    setMappingOpen(false);
    try {
      sessionStorage.removeItem("cyber_backups_cache_v1");
      sessionStorage.removeItem("cyber_page_data_cache_v1");
      sessionStorage.removeItem("cyber_page_data_cache_v2");
    } catch {}
    window.dispatchEvent(new CustomEvent("veritas:backups-changed"));
  };
  if (!job && !loading) {
    return (
      <SolutionDetailPageLayout
        title={copy.solutionTitle || "Sauvegarde"}
        titleIcon="mdi:backup-restore"
        subtitle={copy.empty.title}
        onBack={handleBack}
        backLabel={copy.back}
        hideNav
      >
        <div className={styles.emptyState}>
          <Icon icon="mdi:backup-restore" className={styles.emptyIcon} aria-hidden />
          <h2>{copy.empty.title}</h2>
          <p>{copy.empty.text}</p>
        </div>
      </SolutionDetailPageLayout>
    );
  }

  const mapping = job?.checkmkMapping || {};
  const hycuMapping = job?.hycuMapping || {};
  const lastBackup =
    job?.last_backup_start ??
    job?.rawData?.last_backup_start ??
    job?.last_backup_date ??
    job?.rawData?.last_backup_date ??
    null;
  const duration = formatDuration(job?.last_backup_duration ?? job?.rawData?.last_backup_duration);
  const lastBackupLabel = lastBackup ? formatDateTime(lastBackup) : "-";
  const subtitle = job?.clientId && onNavigate ? (
    <button type="button" className={styles.subtitleLink} onClick={handleOpenClient}>
      {[job.clientName, fleetRow?.providerName].filter(Boolean).join(" · ") || copy.openClient}
    </button>
  ) : (
    [job?.clientName, fleetRow?.providerName].filter(Boolean).join(" · ") || null
  );
  const extraActions = job?.clientId ? (
    <button
      type="button"
      className={`${finderKit.btnSquare} ${finderKit.btnSquareSecondary}`}
      onClick={() => setEditOpen(true)}
      aria-label={copy.editJob}
      title={copy.editJob}
    >
      <Icon icon="mdi:pencil-outline" aria-hidden />
    </button>
  ) : null;
  const editClient = job?.clientId
    ? {
        id: job.clientId,
        name: job.clientName || "",
        nom: job.clientName || ""
      }
    : null;

  return (
    <SolutionDetailPageLayout
      title={job?.nom || copy.solutionTitle || "Sauvegarde"}
      titleIcon={fleetRow?.providerIcon || "mdi:backup-restore"}
      titleImage={fleetRow?.providerImage || null}
      subtitle={subtitle}
      onBack={handleBack}
      backLabel={copy.back}
      loading={loading}
      loadingMessage={copy.loading}
      extraActions={extraActions}
      hideNav
    >
      <div className={styles.content}>
        <aside className={styles.infoCard}>
          <h2 className={styles.infoCardTitle}>{copy.sections.overview}</h2>
          <div className={styles.infoList}>
            <InfoRow
              label={copy.fields.status}
              value={
                <span className={`${styles.statusBadge} ${styles[`status_${status}`] || ""}`} title={getBackupJobStatusTitle(status)}>
                  {getBackupJobStatusLabel(status)}
                </span>
              }
            />
            <InfoRow
              label={copy.fields.activity}
              value={
                <span className={`${styles.statusBadge} ${jobActive ? styles.status_ok : styles.status_inactive}`}>
                  {jobActive ? copy.fields.active : copy.fields.inactive}
                </span>
              }
            />
            <InfoRow label={copy.fields.solution} value={fleetRow?.providerName || "-"} />
            <InfoRow label={copy.fields.jobType} value={job?.typeBackup || "-"} />
            <InfoRow label={copy.fields.lastBackup} value={lastBackupLabel} />
            <InfoRow label={copy.fields.lastDuration} value={duration || "-"} />
          </div>

          <h2 className={styles.infoCardTitle}>{copy.sections.schedule}</h2>
          <div className={styles.infoList}>
            <InfoRow label={copy.fields.regularity} value={job?.regularite || "-"} />
            <InfoRow label={copy.fields.schedule} value={job?.horaire || "-"} />
            <InfoRow label={copy.fields.retention} value={job?.retention || "-"} />
            <InfoRow label={copy.fields.replication} value={job?.replicationVers || "-"} />
          </div>

          <h2 className={styles.infoCardTitle}>{copy.sections.mapping}</h2>
          <div className={styles.mappingBlock}>
            <p className={styles.mappingTitle}>{mapped ? copy.mapping.mapped : copy.mapping.unmapped}</p>
            {!mapped ? (
              <p className={styles.mappingHint}>
                {isHycuInstance ? copy.mapping.hycuHint || copy.mapping.unmappedHint : copy.mapping.unmappedHint}
              </p>
            ) : null}
            {mapped && !isHycuInstance ? (
              <div className={styles.infoList}>
                <InfoRow label={copy.fields.host} value={mapping.checkmk_host_name || "-"} />
                <InfoRow label={copy.fields.site} value={mapping.checkmk_site || "-"} />
                <InfoRow label={copy.fields.service} value={mapping.checkmk_service_name || "-"} />
              </div>
            ) : null}
            {mapped && isHycuInstance ? (
              <div className={styles.infoList}>
                <InfoRow
                  label="HYCU"
                  value={job.hycu_job_name || hycuMapping.hycu_job_name || job.hycu_job_uuid || hycuMapping.hycu_job_uuid || "-"}
                />
              </div>
            ) : null}
            {canMap ? (
              <button
                type="button"
                className={`${styles.mapButton} ${mapped ? styles.mapButtonSecondary : ""}`}
                onClick={() => setMappingOpen(true)}
              >
                <Icon icon={mapped ? "mdi:link-variant" : "mdi:link-variant-plus"} />
                {mapped ? copy.mapping.editAction : copy.mapping.mapAction}
              </button>
            ) : null}
          </div>
        </aside>

        {job ? (
          <JobTopologyVisual
            job={job}
            copy={copy}
            jobActive={jobActive}
            mapped={mapped}
            status={status}
            lastBackupLabel={lastBackupLabel}
          />
        ) : null}
      </div>

      {mappingOpen && job && !isHycuInstance ? (
        <EquipmentMappingModal
          isOpen={mappingOpen}
          onClose={() => setMappingOpen(false)}
          equipment={{
            id: job.id,
            name: job.nom,
            nom: job.nom,
            type: "Backup",
            clientId: job.clientId,
            clientName: job.clientName,
            checkmkMapping: job.checkmkMapping || null
          }}
          requireService={true}
          onMappingSaved={handleMappingSaved}
        />
      ) : null}
      {mappingOpen && job && isHycuInstance ? (
        <HycuJobMappingModal
          open={mappingOpen}
          onClose={() => setMappingOpen(false)}
          clientId={job.clientId}
          job={job}
          hasCheckmkMapping={Boolean(job.checkmkMapping?.checkmk_host_name || job.checkmk_host_name)}
          onMappingSaved={handleMappingSaved}
        />
      ) : null}
      {editOpen && editClient && job ? (
        <BackupConfigModal
          client={editClient}
          initialSection="edit-job"
          initialInstance={job.instanceId ? { id: job.instanceId } : null}
          initialJob={job}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await refreshFromApi();
          }}
        />
      ) : null}
    </SolutionDetailPageLayout>
  );
}
