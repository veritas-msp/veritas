import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(
  __dirname,
  "../src/components/EquipementPage/EquipmentPage.js"
);
let c = fs.readFileSync(target, "utf8");
const mainStart = c.indexOf("      <div className={styles.mainContent}>");
const endMarker = '      {/* Modal "Coming Soon" pour les colonnes */}';
const mainEnd = c.indexOf(endMarker);
if (mainStart < 0 || mainEnd < 0) {
  console.error("markers not found", mainStart, mainEnd);
  process.exit(1);
}
const innerStart = c.indexOf("        {loading ?", mainStart);
const beforeEnd = c.slice(innerStart, mainEnd);
const closeMainIdx = beforeEnd.lastIndexOf("      </div>");
if (innerStart < 0 || closeMainIdx < 0) {
  console.error("inner markers not found", innerStart, closeMainIdx);
  process.exit(1);
}
const embeddedBlock = beforeEnd.slice(0, closeMainIdx).trimEnd();
const mspPanel = `        <EquipmentMspPanel
          loading={loading}
          error={error}
          showClientName
          typeOrder={FILTER_TYPE_ORDER}
          typeIconMap={TYPE_ICON_MAP}
          equipmentByType={equipmentByType}
          typeCounts={typeCounts}
          activeType={panelActiveType}
          statsItems={filteredForStats}
          checkmkIntegrationEnabled={checkmkIntegrationEnabled}
          mkAlertStats={mkAlertStats}
          mkStatusFilter={mkStatusFilter}
          onMkStatusFilter={toggleMkStatusFilter}
          onClearMkFilter={() => setMkStatusFilter(null)}
          onBulkMkSync={handleBulkMkSync}
          mkBulkSyncing={mkBulkSyncing}
          mkBulkSyncProgress={mkBulkSyncProgress}
          onTypeSelect={handleTypeCardClick}
          onEquipmentOpen={handleEquipmentOpen}
          onEquipmentMiddleClick={handleEquipmentMiddleClick}
          resolveMonitorStatus={resolveMonitorStatus}
          getMkSummary={getEquipmentMkSummary}
          isMkMapped={isMkMappedEquipment}
          renderCardActions={renderMspCardActions}
          renderMonitoringBadge={(equipment, summary) => (
            <CheckMKMonitoringStatusBadge summary={summary} isMapped compact />
          )}
          getEmptyMessage={getEquipmentEmptyMessage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          headerActions={mspHeaderActions}
          title="Centre de supervision — Périphériques"
        />`;
const replacement = `      <div className={styles.mainContent}>
        {embedded ? (
${embeddedBlock}
        ) : (
${mspPanel}
        )}
      </div>

`;
c = c.slice(0, mainStart) + replacement + c.slice(mainEnd);
fs.writeFileSync(target, c);
console.log("Split embedded tables vs MSP panel OK");
