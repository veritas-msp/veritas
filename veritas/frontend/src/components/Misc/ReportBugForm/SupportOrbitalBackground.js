import { Icon } from "@iconify/react";
import styles from "./SupportOrbitalBackground.module.css";
const RINGS_HERO = [90, 140, 190, 245, 300, 360];
const RINGS_PAGE = [200, 320, 440, 570, 700, 840];
const ORBIT_NODES = [{
  ring: 1,
  icon: "mdi:bug-outline",
  color: "coral",
  angle: 12,
  duration: 26,
  reverse: false
}, {
  ring: 2,
  icon: "mdi:lightbulb-on-outline",
  color: "gold",
  angle: 95,
  duration: 34,
  reverse: true
}, {
  ring: 3,
  icon: "mdi:help-circle-outline",
  color: "blue",
  angle: 210,
  duration: 42,
  reverse: false
}, {
  ring: 4,
  icon: "mdi:shield-check-outline",
  color: "violet",
  angle: 310,
  duration: 48,
  reverse: true
}, {
  ring: 2,
  icon: "mdi:email-lock-outline",
  color: "violet",
  angle: 250,
  duration: 38,
  reverse: false
}, {
  ring: 4,
  icon: "mdi:lifebuoy",
  color: "coral",
  angle: 55,
  duration: 52,
  reverse: false
}, {
  ring: 5,
  icon: "mdi:headset",
  color: "blue",
  angle: 170,
  duration: 58,
  reverse: true
}];
const ORBIT_DOTS = [{
  ring: 0,
  angle: 30
}, {
  ring: 0,
  angle: 160
}, {
  ring: 1,
  angle: 75
}, {
  ring: 1,
  angle: 220
}, {
  ring: 2,
  angle: 140
}, {
  ring: 2,
  angle: 300
}, {
  ring: 3,
  angle: 40
}, {
  ring: 3,
  angle: 190
}, {
  ring: 4,
  angle: 120
}, {
  ring: 4,
  angle: 280
}, {
  ring: 5,
  angle: 65
}, {
  ring: 5,
  angle: 240
}];
export default function SupportOrbitalBackground({
  variant = "hero"
}) {
  const isPage = variant === "page";
  const rings = isPage ? RINGS_PAGE : RINGS_HERO;
  const rootClass = isPage ? `${styles.root} ${styles.rootPage}` : styles.root;
  return <div className={rootClass} aria-hidden>
      <div className={styles.glow} />
      {rings.map(radius => <div key={radius} className={styles.ring} style={{
      "--r": `${radius}px`
    }} />)}
      {ORBIT_DOTS.map((dot, index) => <span key={`dot-${index}`} className={styles.dot} style={{
      "--r": `${rings[dot.ring]}px`,
      "--angle": `${dot.angle}deg`
    }} />)}
      {ORBIT_NODES.map((node, index) => {
      const radius = rings[node.ring];
      const animName = node.reverse ? styles.spinReverse : styles.spin;
      const nodeClass = isPage ? `${styles.node} ${styles.nodeDiscrete}` : `${styles.node} ${styles[`node_${node.color}`]}`;
      return <div key={`node-${index}`} className={`${styles.orbit} ${animName}`} style={{
        "--r": `${radius}px`,
        "--angle": `${node.angle}deg`,
        "--duration": `${node.duration}s`
      }}>
            <div className={styles.orbitArm}>
              <div className={`${styles.orbitCounter} ${node.reverse ? styles.spin : styles.spinReverse}`}>
                <div className={nodeClass}>
                  <Icon icon={node.icon} />
                </div>
              </div>
            </div>
          </div>;
    })}
    </div>;
}
