import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const LED_VARIANTS = {
  normal: { opacity: 1 },
  animate: i => ({
    opacity: [1, 0.2, 1],
    transition: { delay: i * 0.12, duration: 0.45, ease: "easeInOut" },
  }),
};

const ServerIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        <rect height="8" rx="2" width="18" x="3" y="3" />
        <rect height="8" rx="2" width="18" x="3" y="13" />
        <motion.path animate={controls} custom={0} d="M7 7h0.01" initial="normal" variants={LED_VARIANTS} />
        <motion.path animate={controls} custom={1} d="M7 17h0.01" initial="normal" variants={LED_VARIANTS} />
        <path d="M11 7h6" />
        <path d="M11 17h6" />
      </svg>
    </div>
  );
});

ServerIcon.displayName = "ServerIcon";
ServerIcon.lucideAnimated = true;

export { ServerIcon };
