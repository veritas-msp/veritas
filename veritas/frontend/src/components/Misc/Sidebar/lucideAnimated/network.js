import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const NODE_VARIANTS = {
  normal: { scale: 1, opacity: 1 },
  animate: i => ({
    scale: [1, 1.35, 1],
    opacity: [1, 0.55, 1],
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeInOut" },
  }),
};

const NetworkIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        <rect height="6" rx="1" width="6" x="9" y="2" />
        <motion.circle animate={controls} custom={0} cx="5" cy="19" fill="currentColor" initial="normal" r="1.2" stroke="none" variants={NODE_VARIANTS} />
        <motion.circle animate={controls} custom={1} cx="12" cy="19" fill="currentColor" initial="normal" r="1.2" stroke="none" variants={NODE_VARIANTS} />
        <motion.circle animate={controls} custom={2} cx="19" cy="19" fill="currentColor" initial="normal" r="1.2" stroke="none" variants={NODE_VARIANTS} />
        <path d="M12 8v4" />
        <path d="M5 15v2" />
        <path d="M12 15v2" />
        <path d="M19 15v2" />
        <path d="M5 15h14" />
      </svg>
    </div>
  );
});

NetworkIcon.displayName = "NetworkIcon";
NetworkIcon.lucideAnimated = true;

export { NetworkIcon };
