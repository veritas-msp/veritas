export function getOsIconName(osLabel, {
  withFallback = false
} = {}) {
  if (!osLabel || osLabel === "-") return null;
  const osRaw = String(osLabel).toLowerCase();
  if (!osRaw) return null;
  if (osRaw.includes("windows") || osRaw.includes("win ") || osRaw.startsWith("win")) {
    return "mdi:microsoft-windows";
  }
  if (osRaw.includes("macos") || osRaw.includes("mac os") || osRaw.includes("os x") || osRaw.includes("darwin")) {
    return "mdi:apple";
  }
  if (osRaw.includes("debian")) return "logos:debian";
  if (osRaw.includes("ubuntu")) return "logos:ubuntu";
  if (osRaw.includes("rocky")) return "logos:rocky-linux-icon";
  if (osRaw.includes("alma")) return "logos:almalinux";
  if (osRaw.includes("centos")) return "logos:centos";
  if (osRaw.includes("red hat") || osRaw.includes("rhel")) return "logos:redhat-icon";
  if (osRaw.includes("oracle")) return "logos:oracle";
  if (osRaw.includes("suse") || osRaw.includes("opensuse")) return "logos:suse";
  if (osRaw.includes("arch")) return "logos:archlinux";
  if (osRaw.includes("fedora")) return "logos:fedora";
  if (osRaw.includes("freebsd")) return "logos:freebsd-icon";
  if (osRaw.includes("proxmox")) return "logos:proxmox";
  if (osRaw.includes("hyper-v")) return "mdi:microsoft-windows";
  if (osRaw.includes("esxi") || osRaw.includes("vmware")) return "logos:vmware";
  if (osRaw.includes("linux")) return "logos:linux-tux";
  return withFallback ? "mdi:desktop-classic" : null;
}
