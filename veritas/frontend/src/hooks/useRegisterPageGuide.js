import { useEffect, useRef } from "react";
import { registerPageGuideOpener } from "../components/PageGuide/pageGuideRegistry";

export function useRegisterPageGuide(openFn) {
  const openRef = useRef(openFn);
  openRef.current = openFn;

  useEffect(() => {
    return registerPageGuideOpener(() => {
      openRef.current?.();
    });
  }, []);
}
