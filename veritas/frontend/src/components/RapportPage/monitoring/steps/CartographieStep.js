import React from "react";
import InfrastructureMap from "../../../EnterprisesPage/InfrastructureMap";

export default function CartographieStep({ client }) {
  const clientId = client?.id ?? client?.uuid;
  if (!clientId) {
    return <p style={{ margin: 0, color: "#6b7280" }}>Impossible d’afficher la cartographie : client non identifié.</p>;
  }

  return (
    <div>
      <p style={{ margin: "0 0 0.85rem", color: "#6b7280", fontSize: "0.9rem" }}>
        Vue de l’infrastructure — sites et familles de périphériques.
      </p>
      <InfrastructureMap clientId={clientId} clientSnapshot={client} onNodeClick={null} onBrickClick={null} />
    </div>
  );
}
