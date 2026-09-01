import { useEffect, useState } from "react";
import { MEDIA, readBreakpointFlags } from "../layout/breakpoints";

export function useBreakpoint() {
  const [flags, setFlags] = useState(readBreakpointFlags);

  useEffect(() => {
    const queries = [MEDIA.phone, MEDIA.compact, MEDIA.wide].map(query => window.matchMedia(query));
    const update = () => setFlags(readBreakpointFlags(window));
    queries.forEach(media => media.addEventListener("change", update));
    update();
    return () => queries.forEach(media => media.removeEventListener("change", update));
  }, []);

  const isPhone = flags.isPhone;
  const isCompact = flags.isCompact;
  const isWide = flags.isWide;

  return {
    isPhone,
    isTablet: isCompact && !isPhone,
    isMobile: isCompact,
    isCompactShell: isCompact,
    isDesktop: !isCompact && !isWide,
    isWide
  };
}
