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
  onContextMenu,
  active = false,
  isCommunity = false,
  copy
}) {
  const hasData = Boolean(brick.countLabel) || Number(brick.count) > 0;
  const meta = copy.getStatusMeta(hasData ? brick.status : "unmonitored");
  const icon = getInfraTypeIcon(brick.type, brick.icon);
  const displayName = brick.label;
  const displayStatus = hasData ? toInfraDisplayStatus(brick.status) : "disabled";
  const isAlwaysClickable = Boolean(brick.alwaysClickable);
  const isComingSoon = Boolean(brick.comingSoon);
  const isProLocked = Boolean(isCommunity && brick.proOnly);
  const isEmptyVisual = !isComingSoon && !hasData;
  const isEmptyTemplate = placeholder && isEmptyVisual && !isAlwaysClickable && !isProLocked;
  const interactive = Boolean(onClick) && (isComingSoon || isProLocked || brick.alwaysClickable || !isEmptyTemplate && hasData);
  const isAttention = hasData && !isComingSoon && displayStatus === "attention";
  const isClear = hasData && !isComingSoon && !isAttention;
  const statusTooltip = isEmptyVisual || isClear ? null : copy.getStatusLabel(brick.status);
  const tooltipLines = [brick.label, isComingSoon ? copy.brick.comingSoonTooltip : null, isProLocked ? copy.brick.proTooltip : null, !isComingSoon ? brick.subtitle || statusTooltip : null, !isComingSoon && brick.countLabel ? brick.countLabel : !isComingSoon && brick.count > 0 ? copy.formatElementCount(brick.count) : null, !isComingSoon && isAlwaysClickable && brick.count === 0 ? copy.brick.clickToConfigure : null].filter(Boolean);
  const handleClick = event => {
    // Toujours sélectionner pour le panneau preview ; le toast Pro / bientôt
    // reste géré par les actions du panneau (ou ici en secours sans callback parent).
    onClick?.(brick, event);
    if ((isComingSoon || isProLocked) && typeof onClick !== "function") {
      const featureKey = INFRA_BRICK_PRO_FEATURE_KEYS[brick.type];
      notifyProFeature(copy.getProFeatureLabel(brick.type, brick.label), featureKey);
    }
  };
  const content = <>
      <span className={styles.brickGlyph} aria-hidden>
        <Icon icon={icon} className={styles.brickIcon} />
        {isComingSoon ? <span className={styles.brickComingSoonBadge}>{copy.brick.comingSoon}</span> : null}
        {isProLocked ? <ProFeatureBadge variant="inline" className={styles.brickProBadge} /> : null}
      </span>
      <span className={styles.brickCaption}>
        <span className={styles.brickName}>{displayName}</span>
      </span>
    </>;
  const brickClassName = [
    styles.brickNode,
    isEmptyTemplate && styles.brickNodePlaceholder,
    isEmptyVisual && styles.brickNodeDisabled,
    isComingSoon && styles.brickNodeComingSoon,
    isProLocked && styles.brickNodeProLocked,
    isClear ? styles.brickNodeClear : "",
    isAttention ? styles.brickNodeAttention : "",
    active && styles.brickNodeActive
  ].filter(Boolean).join(" ");
  const brickStyle = {
    "--brick-accent": meta.color,
    "--brick-soft": meta.soft
  };
  if (interactive) {
    return <SmartTooltip content={tooltipLines.join(" · ")} as="span">
        <button
          type="button"
          className={brickClassName}
          data-brick-type={brick.type || ""}
          style={brickStyle}
          onClick={handleClick}
          onContextMenu={event => {
            if (typeof onContextMenu !== "function") return;
            event.preventDefault();
            onContextMenu(brick, event);
          }}
          aria-label={`${displayName}${isComingSoon ? copy.brick.comingSoonAria : isProLocked ? copy.brick.proAria : statusTooltip ? `, ${statusTooltip}` : ""}${brick.countLabel ? `, ${brick.countLabel}` : brick.count > 0 && !isComingSoon ? `, ${copy.formatElementCount(brick.count)}` : ""}`}
          aria-pressed={active || undefined}
        >
          <span className={styles.brickInner}>{content}</span>
        </button>
      </SmartTooltip>;
  }
  return <SmartTooltip content={isEmptyTemplate ? undefined : tooltipLines.join(" · ")} as="span">
      <div
        className={brickClassName}
        data-brick-type={brick.type || ""}
        style={brickStyle}
        aria-hidden={isEmptyTemplate}
      >
        <span className={styles.brickInner}>{content}</span>
      </div>
    </SmartTooltip>;
}
