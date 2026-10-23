import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
import CyberBrickItemsTable from "./CyberBrickItemsTable";
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
  searchPlaceholder = "Rechercher…"
}) {
  const [search, setSearch] = useState("");
  const instanceList = Array.isArray(instances) ? instances : [];
  const jobList = Array.isArray(jobs) ? jobs : [];

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
    <div className={mapStyles.backupOverview}>
      <div className={mapStyles.metricsTopBar}>
        <div className={mapStyles.metricsTopBarLeft}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="search"
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
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        {toolbar ? <div className={mapStyles.metricsTopBarActions}>{toolbar}</div> : null}
      </div>

      <div className={mapStyles.backupTablesSplit}>
        <section className={mapStyles.backupTableBlock} aria-label="Instances de sauvegarde">
          <h3 className={mapStyles.backupTableTitle}>
            Instances
            <span className={mapStyles.backupTableCount}>{filteredInstances.length}</span>
          </h3>
          <div className={mapStyles.backupTableHost}>
            <CyberBrickItemsTable
              brickType="Backup"
              items={filteredInstances}
              emptyLabel="Aucune instance"
              hideSearchBar
              sortable
            />
          </div>
        </section>

        <section className={mapStyles.backupTableBlock} aria-label="Jobs de sauvegarde">
          <h3 className={mapStyles.backupTableTitle}>
            Jobs
            <span className={mapStyles.backupTableCount}>{filteredJobs.length}</span>
          </h3>
          <div className={mapStyles.backupTableHost}>
            <CyberBrickItemsTable
              brickType="BackupJobs"
              items={filteredJobs}
              emptyLabel="Aucun job"
              hideSearchBar
              sortable
            />
          </div>
        </section>
      </div>
    </div>
  );
}
