import { useRef, useEffect, useState, useCallback } from 'react';
function computeTooltipPosition(element) {
  if (!element) return 'bottom';
  const rect = element.getBoundingClientRect();
  const tooltipHeight = 40;
  const tooltipWidth = 170;
  const padding = 10;
  const spaceTop = rect.top;
  const spaceBottom = window.innerHeight - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = window.innerWidth - rect.right;
  const centerX = rect.left + rect.width / 2;
  const halfTooltip = tooltipWidth / 2;
  const overflowsLeft = centerX < halfTooltip + padding;
  const overflowsRight = window.innerWidth - centerX < halfTooltip + padding;
  let position = 'bottom';
  if (spaceBottom < tooltipHeight + padding && spaceTop >= tooltipHeight + padding) {
    position = 'top';
  }
  if (position === 'bottom' || position === 'top') {
    if (overflowsLeft && spaceRight >= tooltipWidth + padding) {
      position = 'right';
    } else if (overflowsRight && spaceLeft >= tooltipWidth + padding) {
      position = 'left';
    }
  } else if (spaceRight < tooltipWidth + padding && spaceLeft >= tooltipWidth + padding) {
    position = 'left';
  }
  if (spaceBottom < tooltipHeight + padding && spaceTop < tooltipHeight + padding) {
    if (spaceRight >= tooltipWidth + padding) {
      position = 'right';
    } else if (spaceLeft >= tooltipWidth + padding) {
      position = 'left';
    }
  }
  return position;
}
export const useSmartTooltip = () => {
  const [tooltipPosition, setTooltipPosition] = useState('bottom');
  const elementRef = useRef(null);
  const recheckPosition = useCallback(() => {
    const position = computeTooltipPosition(elementRef.current);
    setTooltipPosition(position);
    return position;
  }, []);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    recheckPosition();
    window.addEventListener('resize', recheckPosition);
    const observer = new MutationObserver(recheckPosition);
    observer.observe(element, {
      attributes: true,
      subtree: true
    });
    return () => {
      window.removeEventListener('resize', recheckPosition);
      observer.disconnect();
    };
  }, [recheckPosition]);
  return {
    ref: elementRef,
    tooltipPosition,
    recheckPosition
  };
};
export default useSmartTooltip;
