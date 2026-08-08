import React, { useMemo } from "react";
import { useTheme } from "../../../../hooks/useTheme";
import { scoreToLetter } from "../../../../utils/gradeUtils";
import LetterScale from "../../common/LetterScale";
import styles from "../MonitoringSummary.module.css";
import { getIconPath } from "../../../../utils/assetHelper";
export default function Office365Title({
  data,
  config
}) {
  const {
    theme
  } = useTheme();
  const securityScore = useMemo(() => {
    if (!data) return null;
    const o365 = data || {};
    const apiData = o365?.apiData || null;
    const securityData = o365?.securityData || null;
    const manualSecurityScore = o365?.manualSecurityScore ?? null;
    if (!securityData) return null;
    const identitySecureScoreData = securityData?.secureScore || null;
    const identityScoreCurrent = identitySecureScoreData?.currentScore ?? null;
    const identityScoreMax = identitySecureScoreData?.maxScore ?? null;
    const identityScorePercentageCalculated = identitySecureScoreData?.percentage ?? (identityScoreCurrent !== null && identityScoreMax ? Math.round(identityScoreCurrent / identityScoreMax * 1000) / 10 : null);
    const identityScorePercentage = manualSecurityScore !== null ? manualSecurityScore : identityScorePercentageCalculated;
    return {
      score: identityScorePercentage,
      currentScore: identityScoreCurrent,
      maxScore: identityScoreMax
    };
  }, [data]);
  const finalScore = securityScore?.score ?? null;
  const scoreLetter = finalScore !== null ? scoreToLetter(finalScore) : null;
  return <div className={styles.serviceModuleTitleWrapper}>
      <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }}>
        <div style={{
        flex: 1
      }}>
          <h2 className={styles.serviceModuleSubTitle}>
            <img src={getIconPath('office365.png')} alt="Microsoft 365" style={{
            width: '40px',
            height: '40px',
            display: 'inline-block',
            verticalAlign: 'middle',
            marginRight: '0.5rem'
          }} />
            Microsoft
          </h2>
          <p className={styles.serviceModuleSubTitleDescription}>
            Microsoft cloud and collaboration services
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
