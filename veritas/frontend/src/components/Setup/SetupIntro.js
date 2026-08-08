import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppVersion from "../Misc/AppVersion";
import styles from "./SetupIntro.module.css";
const LETTERS = "VERITAS".split("");
const AUTO_DURATION_MS = 4200;
const letterVariants = {
  hidden: {
    opacity: 0,
    y: 48,
    rotateX: -90,
    filter: "blur(8px)"
  },
  visible: i => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      delay: 0.55 + i * 0.07,
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};
export default function SetupIntro({
  onComplete,
  text
}) {
  const [exiting, setExiting] = useState(false);
  const finish = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(onComplete, 700);
  }, [exiting, onComplete]);
  useEffect(() => {
    const timer = window.setTimeout(finish, AUTO_DURATION_MS);
    const onKey = e => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);
  return <motion.div className={styles.overlay} role="presentation" onClick={finish} initial={{
    opacity: 1
  }} animate={{
    opacity: exiting ? 0 : 1
  }} transition={{
    duration: 0.7,
    ease: "easeInOut"
  }}>
      <div className={styles.bgMesh} aria-hidden="true" />
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.scanLine} aria-hidden="true" />
      <div className={styles.particles} aria-hidden="true">
        {Array.from({
        length: 24
      }).map((_, i) => <span key={i} className={styles.particle} style={{
        "--i": i
      }} />)}
      </div>

      <div className={styles.content}>
        <motion.div className={styles.logoWrap} initial={{
        scale: 0,
        opacity: 0,
        rotate: -180
      }} animate={{
        scale: 1,
        opacity: 1,
        rotate: 0
      }} transition={{
        duration: 0.9,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.1
      }}>
          <div className={styles.logoRing} />
          <div className={styles.logoRingOuter} />
          <div className={styles.logo}>
            <span>V</span>
          </div>
        </motion.div>

        <h1 className={styles.title} aria-label="VERITAS">
          {LETTERS.map((char, i) => <motion.span key={`${char}-${i}`} className={styles.letter} custom={i} initial="hidden" animate="visible" variants={letterVariants}>
              {char}
            </motion.span>)}
        </h1>

        <motion.p className={styles.tagline} initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 1.15,
        duration: 0.7,
        ease: "easeOut"
      }}>
          {text.tagline}
        </motion.p>

        <motion.p className={styles.subtitle} initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 1.45,
        duration: 0.6
      }}>
          {text.subtitle}
        </motion.p>

        <motion.div className={styles.progressTrack} initial={{
        opacity: 0,
        scaleX: 0
      }} animate={{
        opacity: 1,
        scaleX: 1
      }} transition={{
        delay: 1.2,
        duration: 0.4
      }}>
          <motion.div className={styles.progressBar} initial={{
          scaleX: 0
        }} animate={{
          scaleX: 1
        }} transition={{
          delay: 1.3,
          duration: 2.6,
          ease: [0.4, 0, 0.2, 1]
        }} />
        </motion.div>
      </div>

      <motion.span className={styles.skip} initial={{
      opacity: 0
    }} animate={{
      opacity: 0.6
    }} transition={{
      delay: 1.8,
      duration: 0.5
    }}>
        {text.skip}
      </motion.span>

      <motion.div className={styles.introVersion} initial={{
      opacity: 0
    }} animate={{
      opacity: 0.5
    }} transition={{
      delay: 2.2,
      duration: 0.5
    }}>
        <AppVersion variant="muted" />
      </motion.div>
    </motion.div>;
}
