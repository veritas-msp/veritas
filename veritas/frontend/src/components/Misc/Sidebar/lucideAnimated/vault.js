import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const DIAL_VARIANTS = {
  normal: { rotate: 0 },
  animate: {
    rotate: [0, 40, -25, 10, 0],
    transition: { duration: 0.55, ease: "easeInOut" },
  },
};

const VaultIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <motion.g animate={controls} initial="normal" style={{ transformOrigin: "12px 12px" }} variants={DIAL_VARIANTS}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 8.5v1.5" />
          <path d="M12 14v1.5" />
          <path d="M8.5 12h1.5" />
          <path d="M14 12h1.5" />
        </motion.g>
        <path d="M7 20v1" />
        <path d="M17 20v1" />
      </svg>
    </div>
  );
});

VaultIcon.displayName = "VaultIcon";
VaultIcon.lucideAnimated = true;

export { VaultIcon };
