import React from "react";
import InfrastructureMap from "../../../EnterprisesPage/InfrastructureMap";
import { MonitoringStepShell, MonitoringStepSection } from "../MonitoringStepLayout";
import styles from "../RapportMonitoringBuilder.module.css";

/**
 * Read-only infrastructure cartography for the supervision report builder.
 */
export default function CartographieStep({ client }) {
  const clientId = client?.id ?? client?.uuid;
  if (!clientId) {
    return (
      <div className={styles.builderSubtitle}>
        Impossible d’afficher la cartographie : client non identifié.
      </div>
    );
  }

  return (
    <MonitoringStepShell>
      <MonitoringStepSection title="Cartographie">
        <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Vue « Votre infrastructure » — sites et familles de périphériques.
        </p>
        <InfrastructureMap
          clientId={clientId}
          clientSnapshot={client}
          onNodeClick={null}
          onBrickClick={null}
        />
      </MonitoringStepSection>
    </MonitoringStepShell>
  );
}
