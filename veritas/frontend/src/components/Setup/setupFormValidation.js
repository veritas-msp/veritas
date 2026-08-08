import { interpolate } from "./setupTranslations";
export function getSetupValidationMessage(input, validationTexts) {
  if (!input || !validationTexts) {
    return "";
  }
  const {
    validity
  } = input;
  if (validity.valueMissing) {
    if (input.type === "number") return validationTexts.numberRequired;
    if (input.type === "email") return validationTexts.invalidEmail;
    if (input.type === "url") return validationTexts.invalidUrl;
    return validationTexts.valueMissing;
  }
  if (validity.badInput && input.type === "number") {
    return validationTexts.numberRequired;
  }
  if (validity.typeMismatch) {
    if (input.type === "email") return validationTexts.invalidEmail;
    if (input.type === "url") return validationTexts.invalidUrl;
    return validationTexts.valueMissing;
  }
  if (validity.rangeUnderflow && input.min !== "") {
    return interpolate(validationTexts.numberMin, {
      min: input.min
    });
  }
  if (validity.rangeOverflow && input.max !== "") {
    return interpolate(validationTexts.numberMax, {
      max: input.max
    });
  }
  if (validity.tooShort && input.minLength > 0) {
    return interpolate(validationTexts.tooShort, {
      min: input.minLength
    });
  }
  return validationTexts.valueMissing;
}
