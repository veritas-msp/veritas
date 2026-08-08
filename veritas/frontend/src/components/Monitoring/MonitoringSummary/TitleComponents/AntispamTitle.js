import React, { useMemo } from "react";
import styles from "../MonitoringSummary.module.css";
import { Icon as IconifyIcon } from "@iconify/react";
import { useTheme } from "../../../../hooks/useTheme";
import { scoreToLetter, scoreToColor } from "../../../../utils/gradeUtils";
import LetterScale from "../../common/LetterScale";
export default function AntispamTitle({
  data,
  config
}) {
  const {
    theme
  } = useTheme();
  const calculateGlobalScore = () => {
    const statsData = data?.statsData || null;
    if (!statsData || statsData.length === 0) {
      return null;
    }
    const totals = statsData.reduce((acc, stat) => ({
      valid: acc.valid + (stat.valid || 0),
      infected: acc.infected + (stat.infected || 0),
      spam: acc.spam + (stat.spam || 0),
      banned: acc.banned + (stat.banned || 0),
      spearphishing: acc.spearphishing + (stat.spearphishing || 0),
      pending: acc.pending + (stat.pending || 0),
      total: acc.total + (stat.total || 0)
    }), {
      valid: 0,
      infected: 0,
      spam: 0,
      banned: 0,
      spearphishing: 0,
      pending: 0,
      total: 0
    });
    if (totals.total === 0) {
      return null;
    }
    const validRate = totals.valid / totals.total * 100;
    const threatRate = (totals.infected + totals.spam + totals.banned + totals.spearphishing) / totals.total * 100;
    const spearphishingRate = totals.spearphishing / totals.total * 100;
    const criticalThreatRate = (totals.infected + totals.spearphishing) / totals.total * 100;
    const validScore = Math.min(100, validRate * 1.0) * 0.4;
    const threatScore = Math.max(0, 100 - threatRate * 2) * 0.3;
    const criticalThreatScore = Math.max(0, 100 - criticalThreatRate * 5) * 0.2;
    const spearphishingScore = Math.max(0, 100 - spearphishingRate * 10) * 0.1;
    let finalScore = validScore + threatScore + criticalThreatScore + spearphishingScore;
    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));
    return finalScore;
  };
  const calculatedScore = useMemo(() => {
    return calculateGlobalScore();
  }, [data]);
  const manualScore = data?.manualHealthScore;
  const finalScore = manualScore !== undefined ? manualScore : calculatedScore;
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
            <IconifyIcon icon="material-symbols:mail-shield-outline" width={50} height={50} color="#000000" />
            <h2>ANTISPAM</h2>
          </div>
          <p className={styles.cyberModuleSubTitleDescription}>
            Email filtering and protection
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
