import React from "react";
import { Icon } from "@iconify/react";
import { SERVER_REMOTE_ACCESS_SOLUTIONS, getServerRemoteAccessSolutionDef, normalizeRemoteAccessSolution, openServerRemoteAccess, readServerRemoteAccessFromForm } from "./constants/serverRemoteAccessUtils";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
export default function ServerRemoteAccessFields({
  remoteAccessSolution = "",
  remoteAccessId = "",
  onSolutionChange,
  onIdChange,
  widgetsCopy = {}
}) {
  const normalizedSolution = normalizeRemoteAccessSolution(remoteAccessSolution);
  const activeSolution = SERVER_REMOTE_ACCESS_SOLUTIONS.find(item => item.value === normalizedSolution)?.value || "";
  const solutionDef = getServerRemoteAccessSolutionDef(activeSolution);
  const solutionCopy = widgetsCopy.solutions?.[activeSolution] || {};
  const canTestLaunch = Boolean(activeSolution && String(remoteAccessId || "").trim());
  const handleTestLaunch = () => {
    openServerRemoteAccess(readServerRemoteAccessFromForm({
      remoteAccessSolution: activeSolution,
      remoteAccessId
    }));
  };
  return <div className={formStyles.fieldFull} style={{
    gridColumn: "1 / -1"
  }}>
      <span className={formStyles.label}>
        {widgetsCopy.title || "Solution de prise en main"}
      </span>
      <div className={formStyles.modulesGrid} style={{
      marginTop: "0.45rem"
    }}>
        {SERVER_REMOTE_ACCESS_SOLUTIONS.map(({
        value,
        label,
        icon,
        description,
        placeholder
      }) => {
        const localized = widgetsCopy.solutions?.[value] || {};
        return <button key={value} type="button" className={`${formStyles.moduleTile} ${activeSolution === value ? formStyles.moduleTileActive : ""}`} onClick={() => onSolutionChange(value)} aria-pressed={activeSolution === value} title={localized.description || description}>
              {activeSolution === value && <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden />}
              <Icon icon={icon} className={formStyles.moduleTileIcon} aria-hidden />
              <span className={formStyles.moduleTileLabel}>{localized.label || label}</span>
            </button>;
      })}
      </div>

      {activeSolution && <div className={formStyles.field} style={{
      marginTop: "0.85rem"
    }}>
          <label className={formStyles.label} htmlFor="server-remote-access-id">
            {solutionCopy.idLabel || solutionDef?.idLabel || widgetsCopy.identifier || "Identifiant"}
          </label>
          <div style={{
        display: "flex",
        gap: "0.55rem",
        alignItems: "stretch"
      }}>
            <input id="server-remote-access-id" type="text" className={formStyles.input} style={{
          flex: 1
        }} value={remoteAccessId ?? ""} onChange={e => onIdChange(e.target.value)} placeholder={solutionDef?.placeholder || widgetsCopy.identifier || "Identifiant"} autoFocus={!remoteAccessId} />
            {canTestLaunch && <button type="button" className={formStyles.ghostBtn} onClick={handleTestLaunch} title={solutionDef?.supportsLaunch ? widgetsCopy.testLaunch || "Tester la connexion (ouvre le client)" : widgetsCopy.copyId || "Copy ID"}>
                {solutionDef?.supportsLaunch ? widgetsCopy.test || "Tester" : widgetsCopy.copy || "Copy"}
              </button>}
          </div>
        </div>}
    </div>;
}
