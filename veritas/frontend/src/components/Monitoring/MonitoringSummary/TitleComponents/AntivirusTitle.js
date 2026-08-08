import React, { useMemo } from "react";
import styles from "../MonitoringSummary.module.css";
import Icon from "@mdi/react";
import { mdiBug } from "@mdi/js";
import { useTheme } from "../../../../hooks/useTheme";
import { scoreToLetter, scoreToColor } from "../../../../utils/gradeUtils";
import LetterScale from "../../common/LetterScale";
export default function AntivirusTitle({
  data,
  config
}) {
  const {
    theme
  } = useTheme();
  const calculateHealthScore = (statistics, enrichedData, endpoints) => {
    if (!statistics && (!enrichedData || !enrichedData.endpoints || enrichedData.endpoints.length === 0)) {
      return null;
    }
    let score = 100;
    const enrichedEndpoints = enrichedData?.endpoints || [];
    const totalEndpoints = statistics?.endpoints?.total || endpoints?.length || 0;
    const managedEndpoints = statistics?.endpoints?.managed || 0;
    const managedRate = totalEndpoints > 0 ? managedEndpoints / totalEndpoints * 100 : 0;
    const managementScore = managedRate / 100 * 25;
    score -= 25 - managementScore;
    const infectedCount = enrichedEndpoints.filter(ep => ep.isInfected).length;
    const infectionRate = enrichedEndpoints.length > 0 ? infectedCount / enrichedEndpoints.length * 100 : 0;
    const infectionScore = Math.max(0, 20 - infectionRate * 20 / 10);
    score -= 20 - infectionScore;
    const onlineCount = enrichedEndpoints.filter(ep => ep.endpointState === 1).length;
    const onlineRate = enrichedEndpoints.length > 0 ? onlineCount / enrichedEndpoints.length * 100 : 0;
    const onlineScore = onlineRate / 100 * 20;
    score -= 20 - onlineScore;
    const upToDateEndpoints = enrichedEndpoints.filter(ep => {
      const agent = ep.agent || {};
      return !agent.signatureOutdated && !agent.productOutdated;
    }).length;
    const upToDateRate = enrichedEndpoints.length > 0 ? upToDateEndpoints / enrichedEndpoints.length * 100 : 0;
    const upToDateScore = upToDateRate / 100 * 15;
    score -= 15 - upToDateScore;
    const disconnected24h = enrichedEndpoints.filter(ep => {
      if (!ep.lastSeen) return false;
      const lastSeenDate = new Date(ep.lastSeen);
      const now = new Date();
      const diffHours = (now - lastSeenDate) / (1000 * 60 * 60);
      return diffHours > 24;
    }).length;
    const disconnectedRate = enrichedEndpoints.length > 0 ? disconnected24h / enrichedEndpoints.length * 100 : 0;
    const disconnectedScore = Math.max(0, 10 - disconnectedRate * 10 / 20);
    score -= 10 - disconnectedScore;
    const malwareDetectedCount = enrichedEndpoints.filter(ep => ep.malwareDetected).length;
    const malwareRate = enrichedEndpoints.length > 0 ? malwareDetectedCount / enrichedEndpoints.length * 100 : 0;
    const malwareScore = Math.max(0, 10 - malwareRate * 10 / 20);
    score -= 10 - malwareScore;
    score = Math.max(0, Math.min(100, score));
    return {
      score: Math.round(score)
    };
  };
  const healthScore = useMemo(() => {
    if (!data || !config) return null;
    const staticData = config?.client?.equipements?.Antivirus || {};
    const solutions = staticData?.solutions || [];
    const bitDefenderSolutions = solutions.filter(sol => sol.solution === "GravityZone BitDefender");
    if (bitDefenderSolutions.length === 0) return null;
    const solution = bitDefenderSolutions[0];
    const syncedData = data?.bitdefenderSolutions?.[0];
    const endpoints = syncedData?.endpoints || solution?.endpoints || [];
    const statistics = syncedData?.statistics || null;
    const enrichedData = data?.bitdefenderEnrichedEndpoints?.[0] || null;
    return calculateHealthScore(statistics, enrichedData, endpoints);
  }, [data, config]);
  const healthScoreValue = healthScore?.score ?? null;
  const manualScore = data?.solutions?.[0]?.manualHealthScore;
  const finalScore = manualScore !== undefined ? manualScore : healthScoreValue;
  const scoreColor = finalScore !== null ? scoreToColor(finalScore) : '#6b7280';
  const scoreLetter = finalScore !== null ? scoreToLetter(finalScore) : null;
  return <div className={styles.cyberModuleTitleWrapper}>
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }}>
        <div style={{
        flex: 1
      }}>
          <div className={styles.cyberModuleSubTitle}>
            <Icon path={mdiBug} size={1} color="#000000" style={{
            width: '50px',
            height: '50px'
          }} />
            <h2>ANTIVIRUS</h2>
          </div>
          <p className={styles.cyberModuleSubTitleDescription}>
            Threat protection and detection
          </p>
        </div>
        {finalScore !== null && <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '1rem',
        marginRight: '-1rem',
        transform: 'scale(1.3)',
        transformOrigin: 'right center'
      }}>
            <LetterScale activeLetter={scoreLetter} theme={theme} letters={["F", "E", "D", "C", "B", "A"]} size="normal" />
          </div>}
      </div>
    </div>;
}
