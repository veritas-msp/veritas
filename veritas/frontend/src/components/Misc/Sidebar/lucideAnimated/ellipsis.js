import { motion, useAnimation } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const DOTS = [5, 12, 19];

const EllipsisIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
      (e) => {
        if (isControlledRef.current) onMouseEnter?.(e);
        else controls.start("animate");
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e) => {
        if (isControlledRef.current) onMouseLeave?.(e);
        else controls.start("normal");
      },
      [controls, onMouseLeave]
    );

    return (
      <div className={className} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg fill="currentColor" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
          {DOTS.map((cx, index) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy="12"
              r="1.7"
              animate={controls}
              custom={index}
              variants={{
                normal: { y: 0 },
                animate: (i) => ({
                  y: [0, -3.5, 0],
                  transition: { delay: i * 0.08, duration: 0.4, ease: "easeInOut" },
                }),
              }}
            />
          ))}
        </svg>
      </div>
    );
  }
);

EllipsisIcon.displayName = "EllipsisIcon";
EllipsisIcon.lucideAnimated = true;

export { EllipsisIcon };
