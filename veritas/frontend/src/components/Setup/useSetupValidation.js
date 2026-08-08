import { useCallback, useMemo } from "react";
import { getSetupValidationMessage } from "./setupFormValidation";
export function useSetupValidation(validationTexts) {
  const onInvalid = useCallback(event => {
    const input = event.target;
    input.setCustomValidity(getSetupValidationMessage(input, validationTexts));
  }, [validationTexts]);
  const onInput = useCallback(event => {
    event.target.setCustomValidity("");
  }, []);
  return useMemo(() => ({
    onInvalid,
    onInput
  }), [onInvalid, onInput]);
}
