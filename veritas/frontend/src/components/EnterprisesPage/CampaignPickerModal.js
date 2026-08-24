import React from "react";
import ManagedSolutionPickerModal from "./ManagedSolutionPickerModal";
import { getCampaignStatusLabel, getCampaignTypeLabel } from "./enterpriseDetailI18n";
import { interpolate } from "../../i18n/translate";

export default function CampaignPickerModal({
  open,
  client,
  campaigns = [],
  locale,
  copy,
  onClose,
  onSelectCampaign,
  onAddCampaign
}) {
  const pickerCopy = copy.campaignPicker || {};
  return <ManagedSolutionPickerModal
    open={open}
    client={client}
    items={campaigns}
    onClose={onClose}
    dialogId="campaign-picker-title"
    eyebrow={pickerCopy.eyebrow || "Cybersecurity"}
    viewTitle={pickerCopy.title || copy.campaignsTitle}
    headerIcon="mdi:bullhorn-outline"
    formatCountLabel={count => count <= 1 ? pickerCopy.countOne || copy.campaignsTitle : interpolate(pickerCopy.countMany || "{count}", { count })}
    getViewIntro={count => {
      if (count === 0) return pickerCopy.introEmpty;
      if (count === 1) return pickerCopy.introOne;
      return interpolate(pickerCopy.introMany || "{count}", { count });
    }}
    getItemKey={(campaign, index) => campaign?.id != null ? `campaign:${campaign.id}` : `idx:${index}`}
    getItemPresentation={campaign => {
      const typeLabel = getCampaignTypeLabel(campaign?.type, locale);
      const statusLabel = getCampaignStatusLabel(campaign?.status, locale);
      return {
        icon: "mdi:bullhorn-outline",
        label: campaign?.name || pickerCopy.untitled || copy.campaignsTitle,
        meta: [typeLabel, statusLabel].filter(Boolean).join(" · "),
        trailingIcon: "mdi:chevron-right"
      };
    }}
    onSelectItem={onSelectCampaign}
    onAddItem={onAddCampaign}
    addAriaLabel={pickerCopy.add || copy.addCampaign}
    addTitle={pickerCopy.add || copy.addCampaign}
  />;
}
