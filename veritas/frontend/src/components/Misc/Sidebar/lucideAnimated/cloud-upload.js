import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const CLOUD_VARIANTS = {
  initial: { y: -2 },
  active: { y: 0 },
};

const CloudUploadIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("initial"),
        stopAnimation: () => controls.start("active"),
      };
    });

    const handleMouseEnter = useCallback(
      (e) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("initial");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("active");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
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
          <path d="M4.2 15.1A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2" />
          <motion.g
            animate={controls}
            transition={{
              duration: 0.3,
              ease: [0.68, -0.6, 0.32, 1.6],
            }}
            variants={CLOUD_VARIANTS}
          >
            <path d="M12 13v8" />
            <path d="m8 17 4-4 4 4" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

CloudUploadIcon.displayName = "CloudUploadIcon";
CloudUploadIcon.lucideAnimated = true;

export { CloudUploadIcon };
