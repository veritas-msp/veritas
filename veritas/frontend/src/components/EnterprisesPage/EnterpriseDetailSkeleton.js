import CrmDetailPageSkeleton from "./CrmDetailPageSkeleton";

/** @deprecated Prefer CrmDetailPageSkeleton — kept as thin alias. */
export default function EnterpriseDetailSkeleton({ loadingAria, titleHint }) {
  return (
    <CrmDetailPageSkeleton
      loadingAria={loadingAria}
      titleHint={titleHint}
      showTitleIcon
      tabCount={7}
      secondaryCount={6}
      body="map"
      showAside
      asideSections={7}
    />
  );
}
