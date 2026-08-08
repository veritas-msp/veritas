import React from "react";
import { Icon } from "@iconify/react";
import { getIconPath } from "../../utils/assetHelper";
import { integrationIconStyle } from "../AdminPage/integrationsCatalog";
import styles from "./AntivirusConfigModal.module.css";
export function getProviderPresentation(provider, fallbackIcon = "mdi:shield-outline") {
  if (!provider) {
    return {
      icon: fallbackIcon,
      image: null,
      iconColor: null
    };
  }
  return {
    icon: provider.icon || fallbackIcon,
    image: provider.image || null,
    iconColor: provider.iconColor || null
  };
}
export default function SolutionProviderIcon({
  provider,
  fallbackIcon = "mdi:shield-outline",
  className
}) {
  const wrapClass = className || styles.solutionCardIcon;
  const {
    icon,
    image,
    iconColor
  } = getProviderPresentation(provider, fallbackIcon);
  return <span className={wrapClass} style={integrationIconStyle(iconColor)} aria-hidden>
      {image ? <img src={getIconPath(image)} alt="" /> : <Icon icon={icon} />}
    </span>;
}
