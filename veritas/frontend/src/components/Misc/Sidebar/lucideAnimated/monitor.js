import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const SCREEN_VARIANTS = {
  normal: { opacity: 1, scale: 1 },
  animate: {
    opacity: [0.35, 1, 0.55, 1],
    scale: [0.96, 1.02, 1],
    transition: { duration: 0.55, ease: "easeInOut" },
  },
};

const MonitorIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        <motion.rect
          animate={controls}
          height="12"
          initial="normal"
          rx="2"
          variants={SCREEN_VARIANTS}
          width="18"
          x="3"
          y="3"
          style={{ transformOrigin: "center" }}
        />
        <path d="M8 21h8" />
        <path d="M12 15v6" />
      </svg>
    </div>
  );
});

MonitorIcon.displayName = "MonitorIcon";
MonitorIcon.lucideAnimated = true;

export { MonitorIcon };
