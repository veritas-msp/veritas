import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const PRONG_VARIANTS = {
  normal: { y: 0 },
  animate: i => ({
    y: [0, -2.5, 0],
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeInOut" },
  }),
};

const PlugIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        <motion.path animate={controls} custom={0} d="M12 22v-5" initial="normal" variants={PRONG_VARIANTS} />
        <motion.path animate={controls} custom={1} d="M9 8V2" initial="normal" variants={PRONG_VARIANTS} />
        <motion.path animate={controls} custom={2} d="M15 8V2" initial="normal" variants={PRONG_VARIANTS} />
        <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
      </svg>
    </div>
  );
});

PlugIcon.displayName = "PlugIcon";
PlugIcon.lucideAnimated = true;

export { PlugIcon };
