import CrmDetailPageSkeleton from "./CrmDetailPageSkeleton";

/** @deprecated Prefer CrmDetailPageSkeleton — kept as thin alias. */
export default function EnterpriseDetailSkeleton({ loadingAria, titleHint }) {
  return (
    <CrmDetailPageSkeleton
      loadingAria={loadingAria}
      titleHint={titleHint}
      showTitleIcon
      showMidSlot
      tabCount={4}
      body="overview"
      showAside
      asideSections={7}
    />
  );
}
