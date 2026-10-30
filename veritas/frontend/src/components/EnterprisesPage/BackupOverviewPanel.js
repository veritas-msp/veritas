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
  const instanceList = Array.isArray(instances) ? instances : [];
  const jobList = Array.isArray(jobs) ? jobs : [];
  const canAddAnything = Boolean(onAddInstance || onAddJob);

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
        className={`${equipStyles.hardwarePageEmbedded} ${equipStyles.embeddedFilterBar} ${equipStyles.embeddedFilterBarToolbar} ${mapStyles.backupInfraToolbar}`.trim()}
      >
        <div className={equipStyles.embeddedSearchWrap}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="text"
              className={equipStyles.embeddedSearchInput}
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
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
          <div className={equipStyles.embeddedSearchActions}>
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
      </div>

      <div className={mapStyles.backupTablesSplit}>
        <section className={mapStyles.backupTableBlock} aria-label="Instances de sauvegarde">
          <div className={mapStyles.backupTableHead}>
            <h3 className={mapStyles.backupTableTitle}>
              Instances
              <span className={mapStyles.backupTableCount}>{filteredInstances.length}</span>
            </h3>
          </div>
          <div className={mapStyles.backupTableHost}>
            <CyberBrickItemsTable
              brickType="Backup"
              items={filteredInstances}
              emptyLabel="Aucune instance"
              hideSearchBar
              sortable
              onEditItem={onEditInstance}
              editLabel={editLabel}
            />
          </div>
        </section>

        <section className={mapStyles.backupTableBlock} aria-label="Jobs de sauvegarde">
          <div className={mapStyles.backupTableHead}>
            <h3 className={mapStyles.backupTableTitle}>
              Jobs
              <span className={mapStyles.backupTableCount}>{filteredJobs.length}</span>
            </h3>
          </div>
          <div className={mapStyles.backupTableHost}>
            <CyberBrickItemsTable
              brickType="BackupJobs"
              items={filteredJobs}
              emptyLabel={!canAddJob ? "Ajoutez d’abord une instance" : "Aucun job"}
              hideSearchBar
              sortable
              onEditItem={typeof getJobActionMenuItems === "function" ? null : onEditJob}
              getActionMenuItems={getJobActionMenuItems}
              editLabel={editLabel}
            />
          </div>
        </section>
      </div>

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
