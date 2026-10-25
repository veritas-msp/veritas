import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const ARROW_VARIANTS = {
  normal: { y: 0, opacity: 1 },
  animate: {
    y: [0, -2.5, 0],
    opacity: [1, 0.7, 1],
    transition: { duration: 0.42, ease: "easeInOut" },
  },
};

const SquareArrowUpIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    e => {
      if (isControlledRef.current) onMouseEnter?.(e);
      else controls.start("animate");
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    e => {
      if (isControlledRef.current) onMouseLeave?.(e);
      else controls.start("normal");
    },
    [controls, onMouseLeave]
  );

  return (
    <div className={className} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="18" rx="2" width="18" x="3" y="3" />
        <motion.g animate={controls} initial="normal" variants={ARROW_VARIANTS}>
          <path d="m16 12-4-4-4 4" />
          <path d="M12 16V8" />
        </motion.g>
      </svg>
    </div>
  );
});

SquareArrowUpIcon.displayName = "SquareArrowUpIcon";
SquareArrowUpIcon.lucideAnimated = true;

export { SquareArrowUpIcon };
