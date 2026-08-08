import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import styles from "./MaintenanceBanner.module.css";
export default function MaintenanceBanner({
  message
}) {
  return <motion.div initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }} className={styles.maintenanceBanner}>
      <div className={styles.content}>
        <Icon icon="mdi:tools" className={styles.icon} />
        <div className={styles.text}>
          <h2 className={styles.title}>Maintenance in progress</h2>
          <p className={styles.message}>
            {message || "The application is currently under maintenance. Please try again later."}
          </p>
        </div>
      </div>
    </motion.div>;
}
