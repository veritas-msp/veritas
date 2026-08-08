import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getPageGuideCopy } from "./pageGuideI18n";
import styles from "./PageGuideTour.module.css";
const SPOTLIGHT_PADDING = 10;
const TOOLTIP_GAP = 14;
function getTargetRect(selector) {
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  return rect;
}
function computeCardPosition(rect, cardSize) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = cardSize.width || 360;
  const cardHeight = cardSize.height || 220;
  if (!rect) {
    return {
      top: Math.max(16, (viewportHeight - cardHeight) / 2),
      left: Math.max(16, (viewportWidth - cardWidth) / 2)
    };
  }
  const spotlightBottom = rect.bottom + SPOTLIGHT_PADDING;
  const spotlightTop = rect.top - SPOTLIGHT_PADDING;
  let top = spotlightBottom + TOOLTIP_GAP;
  let left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), viewportWidth - cardWidth - 16);
  if (top + cardHeight > viewportHeight - 16) {
    top = Math.max(16, spotlightTop - cardHeight - TOOLTIP_GAP);
  }
  return {
    top,
    left
  };
}
export default function PageGuideTour({
  open = false,
  steps = [],
  onClose,
  title,
  locale: localeProp
}) {
  const appLocale = useAppLocale();
  const locale = localeProp ?? appLocale;
  const copy = useMemo(() => getPageGuideCopy(locale), [locale]);
  const resolvedTitle = title ?? copy.defaultTitle;
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({
    top: 0,
    left: 0
  });
  const cardRef = useRef(null);
  const currentStep = steps[stepIndex];
  const total = steps.length;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= total - 1;
  const refreshPositions = useCallback(() => {
    const rect = getTargetRect(currentStep?.target);
    setTargetRect(rect);
    const cardRect = cardRef.current?.getBoundingClientRect();
    setCardPosition(computeCardPosition(rect, {
      width: cardRect?.width || 360,
      height: cardRect?.height || 220
    }));
  }, [currentStep?.target]);
  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  useEffect(() => {
    if (!open || !currentStep) return undefined;
    currentStep.onEnter?.();
    const run = () => {
      const element = currentStep.target ? document.querySelector(currentStep.target) : null;
      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
      });
      window.setTimeout(refreshPositions, 280);
    };
    run();
    return undefined;
  }, [open, stepIndex, currentStep, refreshPositions]);
  useLayoutEffect(() => {
    if (!open) return undefined;
    refreshPositions();
    const frame = window.requestAnimationFrame(refreshPositions);
    const onViewportChange = () => refreshPositions();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, stepIndex, refreshPositions]);
  if (!open || !currentStep || total === 0) return null;
  const spotlightStyle = targetRect ? {
    top: targetRect.top - SPOTLIGHT_PADDING,
    left: targetRect.left - SPOTLIGHT_PADDING,
    width: targetRect.width + SPOTLIGHT_PADDING * 2,
    height: targetRect.height + SPOTLIGHT_PADDING * 2
  } : {
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
    transform: "translate(-50%, -50%)"
  };
  const handlePrevious = () => setStepIndex(index => Math.max(0, index - 1));
  const handleNext = () => {
    if (isLast) {
      onClose?.();
      return;
    }
    setStepIndex(index => Math.min(total - 1, index + 1));
  };
  return createPortal(<div className={styles.overlay} role="presentation">
      <div className={styles.spotlight} style={spotlightStyle}>
        <span className={styles.spotlightRing} aria-hidden />
      </div>

      <div ref={cardRef} className={styles.card} data-page-guide-card style={{
      top: cardPosition.top,
      left: cardPosition.left
    }} role="dialog" aria-modal="true" aria-labelledby="page-guide-title">
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>{resolvedTitle}</p>
            <h2 className={styles.title} id="page-guide-title">
              {currentStep.title}
            </h2>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={copy.closeAria}>
            <Icon icon="mdi:close" />
          </button>
        </div>

        <p className={styles.progress}>
          {copy.formatStepProgress(stepIndex + 1, total)}
        </p>
        <p className={styles.content}>{currentStep.content}</p>

        <div className={styles.footer}>
          <button type="button" className={styles.skipBtn} onClick={onClose}>
            {copy.skip}
          </button>
          <div className={styles.navGroup}>
            <button type="button" className={styles.ghostBtn} onClick={handlePrevious} disabled={isFirst}>
              <Icon icon="mdi:chevron-left" aria-hidden />
              {copy.previous}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleNext}>
              {isLast ? copy.finish : copy.next}
              {!isLast ? <Icon icon="mdi:chevron-right" aria-hidden /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body);
}
