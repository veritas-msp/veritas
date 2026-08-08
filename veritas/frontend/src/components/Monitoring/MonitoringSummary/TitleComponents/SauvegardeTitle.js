import React, { useMemo } from "react";
import styles from "../MonitoringSummary.module.css";
import { Icon as IconifyIcon } from "@iconify/react";
import { useTheme } from "../../../../hooks/useTheme";
import { scoreToLetter } from "../../../../utils/gradeUtils";
import LetterScale from "../../common/LetterScale";
export default function BackupTitle({
  data,
  config
}) {
  const {
    theme
  } = useTheme();
  const calculateGlobalBackupHealthScore = () => {
    const sauvegarde = config?.client?.equipements?.Sauvegarde;
    const instances = sauvegarde?.instances || [];
    if (!data || instances.length === 0) return null;
    let totalJobs = 0;
    let successJobs = 0;
    let failedJobs = 0;
    let warningJobs = 0;
    instances.forEach((instance, instanceIndex) => {
      const instanceData = data?.[instanceIndex];
      if (!instanceData) return;
      Object.keys(instanceData).forEach(jobIndex => {
        if (jobIndex !== 'comment') {
          totalJobs++;
          const jobData = instanceData[jobIndex];
          if (jobData?.lastStatus === "SUCCESS") {
            successJobs++;
          } else if (jobData?.lastStatus === "FAIL") {
            failedJobs++;
          } else if (jobData?.lastStatus === "WARNING") {
            warningJobs++;
          }
        }
      });
    });
    if (totalJobs === 0) return null;
    let score = 100;
    const successRate = successJobs / totalJobs * 100;
    const successScore = successRate / 100 * 50;
    score -= 50 - successScore;
    const failRate = failedJobs / totalJobs * 100;
    const failPenalty = Math.min(failRate * 0.2, 20);
    score -= failPenalty;
    const warningRate = warningJobs / totalJobs * 100;
    const warningPenalty = Math.min(warningRate * 0.1, 10);
    score -= warningPenalty;
    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      score
    };
  };
  const healthScore = useMemo(() => {
    return calculateGlobalBackupHealthScore();
  }, [data, config]);
  const healthScoreValue = healthScore?.score ?? null;
  const manualScore = data?.manualHealthScore;
  const finalScore = manualScore !== undefined ? manualScore : healthScoreValue;
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
            <IconifyIcon icon="material-symbols:backup" width={50} height={50} color="#000000" />
            <h2>BACKUP</h2>
          </div>
          <p className={styles.cyberModuleSubTitleDescription}>
            Data protection and restoration
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
