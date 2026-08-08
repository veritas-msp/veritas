import { useEffect, useRef, useState } from "react";
import { useAppGeneralSettings } from "./useAppGeneralSettings";
export function useDefaultPageSize() {
  const {
    defaultPageSize,
    loaded
  } = useAppGeneralSettings();
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!loaded || initializedRef.current) return;
    setPageSize(defaultPageSize);
    initializedRef.current = true;
  }, [loaded, defaultPageSize]);
  return [pageSize, setPageSize];
}
