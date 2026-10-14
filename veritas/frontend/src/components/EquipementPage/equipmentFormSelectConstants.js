/** Constantes de sélecteurs formulaire — module sans dépendances circulaires. */

export const OS_OPTION_GROUPS = [
  {
    label: "Windows Server",
    options: [
      "Windows Server 2012 R2 Standard",
      "Windows Server 2012 R2 Datacenter",
      "Windows Server 2016 Standard",
      "Windows Server 2016 Datacenter",
      "Windows Server 2019 Standard",
      "Windows Server 2019 Datacenter",
      "Windows Server 2022 Standard",
      "Windows Server 2022 Datacenter",
      "Windows Server 2025 Standard",
      "Windows Server 2025 Datacenter"
    ]
  },
  {
    label: "Windows client",
    options: ["Windows 10 Pro", "Windows 10 Enterprise", "Windows 11 Pro", "Windows 11 Enterprise"]
  },
  {
    label: "Linux · Ubuntu",
    options: ["Ubuntu Server 20.04 LTS", "Ubuntu Server 22.04 LTS", "Ubuntu Server 24.04 LTS"]
  },
  {
    label: "Linux · Debian",
    options: ["Debian 11 (Bullseye)", "Debian 12 (Bookworm)"]
  },
  {
    label: "Hypervisors",
    options: [
      "Proxmox VE 7",
      "Proxmox VE 8",
      "Proxmox VE 9",
      "VMware ESXi 6.7",
      "VMware ESXi 7.0",
      "VMware ESXi 8.0",
      "VMware vCenter Server 7.0",
      "VMware vCenter Server 8.0",
      "Microsoft Hyper-V Server 2019",
      "Microsoft Hyper-V Server 2022",
      "Microsoft Hyper-V Server 2025",
      "Citrix XenServer / Hypervisor",
      "XCP-ng",
      "Nutanix AHV",
      "KVM"
    ]
  },
  {
    label: "Other",
    options: ["Autre"]
  }
];

export const OS_OPTIONS = OS_OPTION_GROUPS.flatMap(group => group.options);

export const RAID_OPTIONS = ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "RAID 10", "None", "Autre"];

export const SERVER_HYPERVISOR_OPTIONS = [
  "VMware ESXi",
  "Microsoft Hyper-V",
  "Proxmox VE",
  "Nutanix AHV",
  "KVM",
  "Xen",
  "Azure VM",
  "AWS EC2",
  "Autre"
];
