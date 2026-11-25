import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import CyberBrickItemsTable from "./CyberBrickItemsTable";
import BackupAddChoiceModal from "./BackupAddChoiceModal";
import mapStyles from "./InfrastructureMap.module.css";

function formatDateTime(value) {
  if (value == null || value === "") return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

export default function BackupOverviewPanel({
  instances = [],
  jobs = [],
  toolbar = null,
  searchPlaceholder = "Rechercher…",
  onAddInstance = null,
  onAddJob = null,
  onEditInstance = null,
  onEditJob = null,
  getJobActionMenuItems = null,
  canAddJob = false,
  addInstanceLabel = "Ajouter une instance",
  addJobLabel = "Ajouter un job",
  addJobDisabledHint = "Ajoutez d’abord une instance",
  editLabel = "Éditer"
}) {
  const [search, setSearch] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [view, setView] = useState("jobs");
  const instanceList = Array.isArray(instances) ? instances : [];
  const jobList = Array.isArray(jobs) ? jobs : [];
  const canAddAnything = Boolean(onAddInstance || onAddJob);

  const jobSearchLabel = searchPlaceholder === "Rechercher…" ? "Rechercher une sauvegarde…" : searchPlaceholder;

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobList;
    return jobList.filter(job => {
      const haystack = [
        job?.nom,
        job?.instanceLogiciel,
        job?.typeBackup,
        Array.isArray(job?.serveurLie) ? job.serveurLie.join(" ") : job?.serveurLie,
        job?.destination,
        job?.stockageLie,
        job?.regularite,
        job?.horaire,
        job?.retention,
        job?.isMapped ? "mappé mapped oui" : "non",
        formatDateTime(job?.last_backup_date)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [jobList, search]);

  const filteredInstances = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return instanceList;
    return instanceList.filter(item => {
      const haystack = [
        item?.logiciel,
        item?.server,
        item?.version,
        item?.expiration,
        item?.jobsCount,
        item?.mappedJobsCount
      ]
        .filter(v => v != null && v !== "")
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [instanceList, search]);

  return (
    <div className={`${mapStyles.backupOverview} ${mapStyles.backupOverviewInfraSearch}`.trim()}>
      <div
        className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${equipStyles.embeddedToolbarGrid} ${mapStyles.backupInfraToolbar}`.trim()}
      >
        <div className={equipStyles.embeddedToolbarSlotStart}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="text"
              className={equipStyles.embeddedSearchInput}
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={view === "instances" ? "Rechercher une instance…" : jobSearchLabel}
              aria-label={view === "instances" ? "Rechercher une instance…" : jobSearchLabel}
            />
            {search ? (
              <button
                type="button"
                className={equipStyles.embeddedSearchClear}
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
              >
                <FaTimes aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <div className={equipStyles.embeddedToolbarSlotCenter}>
          <div className={mapStyles.backupViewSwitch} role="tablist" aria-label="Affichage de la sauvegarde">
            <button
              type="button"
              role="tab"
              aria-selected={view === "instances"}
              className={`${mapStyles.backupViewBtn} ${view === "instances" ? mapStyles.backupViewBtnActive : ""}`}
              onClick={() => setView("instances")}
            >
              Instances
              <span className={mapStyles.backupTableCount}>{instanceList.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "jobs"}
              className={`${mapStyles.backupViewBtn} ${view === "jobs" ? mapStyles.backupViewBtnActive : ""}`}
              onClick={() => setView("jobs")}
            >
              Sauvegardes
              <span className={mapStyles.backupTableCount}>{jobList.length}</span>
            </button>
          </div>
        </div>
        <div className={equipStyles.embeddedToolbarSlotEnd}>
            {toolbar}
            {canAddAnything ? (
              <button
                type="button"
                className={mapStyles.backupTableAddBtn}
                onClick={() => setChoiceOpen(true)}
                title="Ajouter"
                aria-label="Ajouter une instance ou un job"
              >
                <Icon icon="mdi:plus" aria-hidden />
              </button>
            ) : null}
        </div>
      </div>

      <section
        className={`${mapStyles.backupTableBlock} ${mapStyles.backupTableSolo}`}
        aria-label={view === "instances" ? "Instances de sauvegarde" : "Sauvegardes"}
      >
        <div className={mapStyles.backupTableHost}>
          {view === "instances" ? (
            <CyberBrickItemsTable
              brickType="Backup"
              items={filteredInstances}
              emptyLabel="Aucune instance"
              hideSearchBar
              sortable
              onEditItem={onEditInstance}
              editLabel={editLabel}
            />
          ) : (
            <CyberBrickItemsTable
              brickType="BackupJobs"
              items={filteredJobs}
              emptyLabel={!canAddJob ? "Ajoutez d’abord une instance" : "Aucune sauvegarde"}
              hideSearchBar
              sortable
              onEditItem={typeof getJobActionMenuItems === "function" ? null : onEditJob}
              getActionMenuItems={getJobActionMenuItems}
              editLabel={editLabel}
            />
          )}
        </div>
      </section>

      <BackupAddChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        canAddJob={Boolean(canAddJob && onAddJob)}
        addInstanceLabel="Instance"
        addJobLabel="Job"
        addJobDisabledHint={addJobDisabledHint}
        onChooseInstance={() => {
          if (onAddInstance) onAddInstance();
        }}
        onChooseJob={() => {
          if (onAddJob) onAddJob();
        }}
      />
    </div>
  );
}
