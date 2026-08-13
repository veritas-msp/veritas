import React from "react";
import { Icon } from "@iconify/react";
import SmartTooltip from "../SmartTooltip";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { notifyProFeature } from "../Misc/ProFeature/proFeatureUtils";
import { INFRA_BRICK_PRO_FEATURE_KEYS } from "./infraHoneycombLayout";
import { getInfraTypeIcon, toInfraDisplayStatus } from "./infraMapUtils";
import styles from "./InfrastructureMap.module.css";
export default function InfraBrick({
  brick,
  placeholder = false,
  onClick,
  active = false,
  isCommunity = false,
  copy
}) {
  const meta = copy.getStatusMeta(brick.status);
  const icon = getInfraTypeIcon(brick.type, brick.icon);
  const displayName = brick.label;
  const displayStatus = toInfraDisplayStatus(brick.status);
  const isAlwaysClickable = Boolean(brick.alwaysClickable);
  const isEmptyTemplate = placeholder && brick.count === 0 && !isAlwaysClickable;
  const isComingSoon = Boolean(brick.comingSoon);
  const isProLocked = Boolean(isCommunity && brick.proOnly);
  const interactive = Boolean(onClick) && (isComingSoon || isProLocked || brick.alwaysClickable || !isEmptyTemplate && brick.count > 0);
  const isAttention = !isComingSoon && displayStatus === "attention";
  const isClear = !isEmptyTemplate && !isComingSoon && displayStatus === "clear";
  const isDisabled = !isEmptyTemplate && !isComingSoon && displayStatus === "disabled";
  const statusTooltip = isEmptyTemplate || brick.count === 0 && isAlwaysClickable ? null : copy.getStatusLabel(brick.status);
  const tooltipLines = [brick.label, isComingSoon ? copy.brick.comingSoonTooltip : null, isProLocked ? copy.brick.proTooltip : null, !isComingSoon ? brick.subtitle || statusTooltip : null, !isComingSoon && brick.countLabel ? brick.countLabel : !isComingSoon && brick.count > 0 ? copy.formatElementCount(brick.count) : null, !isComingSoon && isAlwaysClickable && brick.count === 0 ? copy.brick.clickToConfigure : null].filter(Boolean);
  const handleClick = () => {
    const featureKey = INFRA_BRICK_PRO_FEATURE_KEYS[brick.type];
    if (isComingSoon || isProLocked) {
      notifyProFeature(copy.getProFeatureLabel(brick.type, brick.label), featureKey);
      return;
    }
    onClick?.(brick);
  };
  const content = <>
      <Icon icon={icon} className={styles.brickIcon} aria-hidden />
      <span className={styles.brickName}>{displayName}</span>
      {isComingSoon ? <span className={styles.brickComingSoonBadge}>{copy.brick.comingSoon}</span> : null}
      {isProLocked ? <ProFeatureBadge variant="inline" className={styles.brickProBadge} /> : null}
      {!isEmptyTemplate && !isComingSoon && (brick.countLabel || brick.count > 0) && <span className={styles.infraItemCount} aria-hidden>
          {brick.countLabel || brick.count}
        </span>}
    </>;
  const brickClassName = [styles.brickNode, isEmptyTemplate && styles.brickNodePlaceholder, isComingSoon && styles.brickNodeComingSoon, isProLocked && styles.brickNodeProLocked, isClear ? styles.brickNodeClear : "", isDisabled ? styles.brickNodeDisabled : "", isAttention && !isEmptyTemplate ? styles.brickNodeAttention : "", active && styles.brickNodeActive].filter(Boolean).join(" ");
  if (interactive) {
    return <SmartTooltip content={tooltipLines.join(" · ")} as="span">
        <button type="button" className={brickClassName} style={{
        "--brick-accent": meta.color,
        "--brick-soft": meta.soft
      }} onClick={handleClick} aria-label={`${displayName}${isComingSoon ? copy.brick.comingSoonAria : isProLocked ? copy.brick.proAria : statusTooltip ? `, ${statusTooltip}` : ""}${brick.countLabel ? `, ${brick.countLabel}` : brick.count > 0 && !isComingSoon ? `, ${copy.formatElementCount(brick.count)}` : ""}`} aria-pressed={active || undefined}>
          <span className={styles.brickInner}>{content}</span>
        </button>
      </SmartTooltip>;
  }
  return <SmartTooltip content={isEmptyTemplate ? undefined : tooltipLines.join(" · ")} as="span">
      <div className={brickClassName} style={{
      "--brick-accent": meta.color,
      "--brick-soft": meta.soft
    }} aria-hidden={isEmptyTemplate}>
        <span className={styles.brickInner}>{content}</span>
      </div>
    </SmartTooltip>;
}
