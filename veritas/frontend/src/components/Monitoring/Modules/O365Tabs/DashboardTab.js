import React from 'react';
import { scoreToLetter, letterToScore, letterToColor } from '../../../../utils/gradeUtils';
import LetterScale from '../../common/LetterScale';
import MetricLetter from '../../common/MetricLetter';
import { FaInfoCircle } from 'react-icons/fa';
import styles from '../O365.module.css';
export default function DashboardTab({
  detailData,
  dashboardMetrics,
  animatedDashboardMetrics,
  adoptionScore,
  tenantId,
  theme,
  securityScore,
  securityScoreBaseValue,
  editingSecurityScore,
  editingSecurityScoreValue,
  setEditingSecurityScore,
  setEditingSecurityScoreValue,
  setManualSecurityScore,
  update,
  animatedSecurityScore,
  setAnimatedSecurityScore,
  animatedSecurityScoreRef,
  isManualChangeRef,
  hoveredSecurityTooltip,
  setHoveredSecurityTooltip,
  renderCommentSection
}) {
  const calculatedScore = securityScore?.score || null;
  const baseScoreValue = securityScoreBaseValue;
  const isEditing = editingSecurityScore;
  const displayedScoreValue = isEditing ? editingSecurityScoreValue !== null ? editingSecurityScoreValue : baseScoreValue : animatedSecurityScore !== null ? animatedSecurityScore : baseScoreValue;
  const normalizedDisplayedScore = displayedScoreValue !== null && displayedScoreValue !== undefined ? Math.max(0, Math.min(100, parseInt(displayedScoreValue, 10) || 0)) : null;
  const scoreColor = normalizedDisplayedScore !== null ? letterToColor(scoreToLetter(normalizedDisplayedScore)) : '#6b7280';
  const scoreLetter = normalizedDisplayedScore !== null ? scoreToLetter(normalizedDisplayedScore) : null;
  const hasScore = baseScoreValue !== null && baseScoreValue !== undefined;
  return <div className={styles.dashboardSection} style={{
    position: 'relative'
  }}>
            {}
            {securityScore && <div style={{
      marginBottom: '1.5rem',
      padding: '1rem',
      borderRadius: '12px',
      background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
      border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      minHeight: '140px'
    }}>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '120px'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
                            {editingSecurityScore ? <input type="number" min="0" max="100" value={editingSecurityScoreValue !== null ? editingSecurityScoreValue : baseScoreValue ?? ''} onChange={e => setEditingSecurityScoreValue(e.target.value)} onBlur={() => {
            if (editingSecurityScoreValue !== null) {
              const score = Math.max(0, Math.min(100, parseInt(editingSecurityScoreValue, 10) || 0));
              setManualSecurityScore(score);
              update({
                manualSecurityScore: score
              });
            }
            setEditingSecurityScore(false);
            setEditingSecurityScoreValue(null);
          }} onKeyDown={e => {
            if (e.key === 'Enter') {
              if (editingSecurityScoreValue !== null) {
                const score = Math.max(0, Math.min(100, parseInt(editingSecurityScoreValue, 10) || 0));
                setManualSecurityScore(score);
                update({
                  manualSecurityScore: score
                });
              }
              setEditingSecurityScore(false);
              setEditingSecurityScoreValue(null);
            } else if (e.key === 'Escape') {
              setEditingSecurityScore(false);
              setEditingSecurityScoreValue(null);
            }
          }} autoFocus style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: scoreColor,
            lineHeight: '1',
            width: '80px',
            border: `2px solid ${scoreColor}`,
            borderRadius: '4px',
            padding: '0.25rem',
            background: theme === 'dark' ? '#2d2d4f' : '#ffffff',
            textAlign: 'center'
          }} /> : <div title={hasScore ? "Click a letter to select a grade" : ""} style={{
            cursor: hasScore ? 'pointer' : 'default',
            outline: 'none'
          }}>
                                    <LetterScale activeLetter={scoreLetter} theme={theme} letters={["F", "E", "D", "C", "B", "A"]} size="normal" onSelect={hasScore ? letter => {
              const score = letterToScore(letter);
              if (score !== null) {
                isManualChangeRef.current = true;
                setAnimatedSecurityScore(score);
                animatedSecurityScoreRef.current = score;
                setManualSecurityScore(score);
                update({
                  manualSecurityScore: score
                });
              }
            } : undefined} highlightLetter={calculatedScore !== null && baseScoreValue !== null && baseScoreValue !== calculatedScore ? scoreToLetter(calculatedScore) : null} />
                                </div>}
                            <div style={{
            position: 'relative'
          }}>
                                <FaInfoCircle style={{
              fontSize: '0.875rem',
              color: theme === 'dark' ? '#9ca3af' : '#6b7280',
              cursor: 'pointer'
            }} onMouseEnter={e => {
              const scoreBreakdown = securityScore?.factors?.map(factor => ({
                label: factor.name,
                description: factor.isPenalty ? `Penalty: -${(factor.weight - factor.earnedPoints).toFixed(0)} pts` : `${factor.earnedPoints} pts`,
                weight: factor.isPenalty ? `-${(factor.weight - factor.earnedPoints).toFixed(0)} pts` : `${factor.earnedPoints} pts`,
                value: typeof factor.value === 'number' ? factor.value.toFixed(1) : factor.value
              })) || [];
              setHoveredSecurityTooltip({
                mouseX: e.clientX,
                mouseY: e.clientY,
                scoreBreakdown
              });
            }} onMouseMove={e => {
              if (hoveredSecurityTooltip) {
                setHoveredSecurityTooltip(prev => ({
                  ...prev,
                  mouseX: e.clientX,
                  mouseY: e.clientY
                }));
              }
            }} onMouseLeave={() => {
              setHoveredSecurityTooltip(null);
            }} />
                            </div>
                        </div>
                    </div>
                    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem 1rem',
        flex: 1,
        maxWidth: '400px'
      }}>
                        <div style={{
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#d1d5db' : '#374151',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
                            <MetricLetter value={securityScore?.mfaRate} higherIsBetter={true} theme={theme} showValue={false} />
                            <strong>MFA Users</strong>
                        </div>
                        <div style={{
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#d1d5db' : '#374151',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
                            <MetricLetter value={securityScore?.adminMfaRate} higherIsBetter={true} theme={theme} showValue={false} />
                            <strong>MFA Administrateurs</strong>
                        </div>
                    </div>
                </div>}

            {}
            {adoptionScore && <div style={{
      marginBottom: '1.5rem',
      padding: '1rem',
      borderRadius: '12px',
      background: theme === 'dark' ? '#2d2d4f' : '#f9fafb',
      border: `2px solid ${theme === 'dark' ? '#4a4a6a' : '#e5e7eb'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem'
    }}>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '120px'
      }}>
                        <div style={{
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginBottom: '0.5rem',
          fontWeight: '600'
        }}>
                            Score d'adoption
                        </div>
                        <div style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#3b82f6',
          lineHeight: '1'
        }}>
                            {adoptionScore.totalScore || 0}
                        </div>
                        <div style={{
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginTop: '0.25rem'
        }}>
                            / {adoptionScore.maxScore || 700} points
                        </div>
                        {adoptionScore.totalScore && adoptionScore.maxScore && <div style={{
          fontSize: '0.7rem',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          marginTop: '0.5rem',
          fontWeight: '500'
        }}>
                                {Math.round(adoptionScore.totalScore / adoptionScore.maxScore * 100)}%
                            </div>}
                    </div>
                    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem 1rem',
        flex: 1,
        maxWidth: '400px'
      }}>
                        {adoptionScore.peopleExperiences !== undefined && <div style={{
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#d1d5db' : '#374151',
          whiteSpace: 'nowrap'
        }}>
                                <strong>People experiences:</strong> {adoptionScore.peopleExperiences} / 400
                            </div>}
                        {adoptionScore.technologyExperiences !== undefined && <div style={{
          fontSize: '0.75rem',
          color: theme === 'dark' ? '#d1d5db' : '#374151',
          whiteSpace: 'nowrap'
        }}>
                                <strong>Technology experiences:</strong> {adoptionScore.technologyExperiences} / 400
                            </div>}
                    </div>
                </div>}

            {}
            {dashboardMetrics && <>
                    <div className={styles.metricsRow}>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Users totaux</div>
                            <div className={styles.metricValue}>
                                {animatedDashboardMetrics?.totalUsers ?? dashboardMetrics.totalUsers}
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Actives (30j)</div>
                            <div className={styles.metricValue} style={{
            color: '#10b981'
          }}>
                                {animatedDashboardMetrics?.activeUsers30 ?? dashboardMetrics.activeUsers30}
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Actives (90j)</div>
                            <div className={styles.metricValue} style={{
            color: '#3b82f6'
          }}>
                                {animatedDashboardMetrics?.activeUsers90 ?? dashboardMetrics.activeUsers90}
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Taux d'adoption</div>
                            <div className={styles.metricValue}>
                                {animatedDashboardMetrics?.adoptionRate ?? dashboardMetrics.adoptionRate}%
                            </div>
                        </div>
                    </div>
                    
                    {}
                    <div className={styles.metricsRow} style={{
        marginTop: '1rem'
      }}>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Total licenses</div>
                            <div className={styles.metricValue}>
                                {animatedDashboardMetrics?.totalLicenses ?? dashboardMetrics.totalLicenses}
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Used licenses</div>
                            <div className={styles.metricValue} style={{
            color: '#f59e0b'
          }}>
                                {animatedDashboardMetrics?.usedLicenses ?? dashboardMetrics.usedLicenses}
                            </div>
                        </div>
                        <div className={styles.metricItem}>
                            <div className={styles.metricLabel}>Taux d'utilisation</div>
                            <div className={styles.metricValue}>
                                {(animatedDashboardMetrics?.totalLicenses ?? dashboardMetrics.totalLicenses) > 0 ? Math.round((animatedDashboardMetrics?.usedLicenses ?? dashboardMetrics.usedLicenses) / (animatedDashboardMetrics?.totalLicenses ?? dashboardMetrics.totalLicenses) * 100) : 0}%
                            </div>
                        </div>
                    </div>
                </>}

            {}
            {renderCommentSection && renderCommentSection('dashboard', 'Dashboard')}
        </div>;
}
