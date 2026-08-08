import React, { useMemo } from "react";
import styles from "../MonitoringSummary.module.css";
import { Icon as IconifyIcon } from "@iconify/react";
import { useTheme } from "../../../../hooks/useTheme";
import { scoreToLetter, scoreToColor } from "../../../../utils/gradeUtils";
import LetterScale from "../../common/LetterScale";
export default function FirewallReglesTitle({
  data,
  config
}) {
  const {
    theme
  } = useTheme();
  const securityScoreData = useMemo(() => {
    const rulesData = data?.rulesData || null;
    const objectsData = data?.objectsData || null;
    const alarmsData = data?.alarmsData || null;
    const webTrafficData = data?.webTrafficData || null;
    const totalAlarms = alarmsData?.total || alarmsData?.entries?.reduce((sum, entry) => sum + (entry.count || 0), 0) || 0;
    const totalTrafficBytes = webTrafficData?.entries?.reduce((sum, entry) => sum + (entry.totalBytes || 0), 0) || 0;
    const breakdown = [];
    let earnedPoints = 0;
    let availablePoints = 0;
    const clampRatio = value => Math.max(0, Math.min(1, value));
    const registerCriterion = (applicable, weight, label, value, ratio, percentage = null) => {
      if (!applicable) return;
      availablePoints += weight;
      const normalizedRatio = clampRatio(ratio);
      earnedPoints += normalizedRatio * weight;
      const displayPercentage = percentage !== null ? percentage : Math.round(normalizedRatio * 100);
      breakdown.push({
        label,
        value,
        percentage: displayPercentage,
        ratio: normalizedRatio,
        weight
      });
    };
    const allFilterRules = rulesData?.filterRules?.flatMap(group => group.rules) || [];
    const totalFilterRules = allFilterRules.length;
    if (totalFilterRules > 0) {
      const activeCount = allFilterRules.filter(rule => (rule.state || '').toLowerCase() === 'on').length;
      const activeRatio = totalFilterRules > 0 ? activeCount / totalFilterRules : 0;
      registerCriterion(true, 25, "Active rules", `${Math.round(activeRatio * 100)}% active`, activeRatio, Math.round(activeRatio * 100));
      const denyKeywords = ['deny', 'drop', 'block', 'reject', 'forbid', 'interdit'];
      const allowKeywords = ['allow', 'pass', 'accept', 'permit'];
      const denyCount = allFilterRules.filter(rule => {
        const action = (rule.action || '').toLowerCase();
        if (!action) return false;
        if (denyKeywords.some(keyword => action.includes(keyword))) return true;
        if (allowKeywords.some(keyword => action.includes(keyword))) return false;
        return false;
      }).length;
      const allowCount = allFilterRules.filter(rule => {
        const action = (rule.action || '').toLowerCase();
        if (!action) return false;
        return allowKeywords.some(keyword => action.includes(keyword));
      }).length;
      const denyRatio = totalFilterRules > 0 ? denyCount / totalFilterRules : 0;
      const hasBothPolicies = denyCount > 0 && allowCount > 0;
      const policyScore = denyRatio * 0.8 + (hasBothPolicies ? 0.2 : 0);
      registerCriterion(true, 20, "Restrictive policy", `${Math.round(denyRatio * 100)}% blocking rules`, Math.min(1, policyScore), Math.round(Math.min(1, policyScore) * 100));
      const inspectedCount = allFilterRules.filter(rule => {
        const inspection = (rule.inspection || '').toLowerCase();
        return inspection && inspection !== 'none' && inspection !== 'off';
      }).length;
      const inspectionRatio = totalFilterRules > 0 ? inspectedCount / totalFilterRules : 0;
      registerCriterion(true, 15, "Advanced inspection", `${Math.round(inspectionRatio * 100)}% of rules inspected`, inspectionRatio, Math.round(inspectionRatio * 100));
    }
    if (totalAlarms > 0) {
      const minThreshold = 10;
      const optimalThreshold = 100;
      let alarmRatio = 1;
      if (totalAlarms < minThreshold) {
        alarmRatio = totalAlarms / minThreshold * 0.5;
      } else if (totalAlarms >= optimalThreshold) {
        alarmRatio = 1;
      } else {
        const range = optimalThreshold - minThreshold;
        alarmRatio = 0.5 + (totalAlarms - minThreshold) / range * 0.5;
      }
      registerCriterion(true, 20, "Threat detection", `${totalAlarms.toLocaleString()} threats detected`, alarmRatio, Math.round(alarmRatio * 100));
    }
    if (objectsData?.total) {
      const objectRatio = clampRatio(objectsData.total / 25);
      registerCriterion(true, 10, "Object coverage", `${objectsData.total.toLocaleString()} objects`, objectRatio, Math.round(objectRatio * 100));
    }
    if (totalTrafficBytes > 0) {
      const trustedTrafficBytes = (webTrafficData?.entries || []).filter(entry => entry.icon).reduce((sum, entry) => sum + (entry.totalBytes || 0), 0);
      const trustedRatio = totalTrafficBytes > 0 ? trustedTrafficBytes / totalTrafficBytes : 0;
      registerCriterion(true, 10, "Identified traffic", `${Math.round(trustedRatio * 100)}% to known services`, trustedRatio, Math.round(trustedRatio * 100));
    }
    if (availablePoints === 0) {
      return null;
    }
    const rawScore = earnedPoints / availablePoints * 100;
    const score = Math.round(rawScore);
    const letter = scoreToLetter(score);
    const scoreColor = scoreToColor(score);
    return {
      score,
      color: scoreColor,
      letter
    };
  }, [data]);
  const shouldShowNA = !securityScoreData;
  const calculatedScore = shouldShowNA ? null : securityScoreData.score;
  const manualScore = data?.manualHealthScore;
  const finalScore = shouldShowNA ? null : manualScore !== undefined ? manualScore : calculatedScore;
  const scoreLetter = shouldShowNA ? null : finalScore !== null ? scoreToLetter(finalScore) || null : null;
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
            <IconifyIcon icon="iconoir:pc-firewall" width={50} height={50} color="#000000" />
            <h2>FIREWALL RULES</h2>
          </div>
          <p className={styles.cyberModuleSubTitleDescription}>
            Filtering rules and access control
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
