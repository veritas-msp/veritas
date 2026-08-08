import { toast } from "react-toastify";
import { getToastPosition } from "./toastPosition";
const defaultConfig = {
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnFocusLoss: false,
  pauseOnHover: false,
  theme: "light"
};
const withPosition = config => ({
  ...config,
  position: getToastPosition()
});
const translate = msg => {
  const map = {
    "Utilisateur introuvable": "User not found",
    "Mot de passe incorrect": "Incorrect password",
    "Invalid password": "Incorrect password"
  };
  return map[msg] || msg;
};
export const showSuccess = msg => toast.success(translate(msg), withPosition(defaultConfig));
export const showError = msg => toast.error(translate(msg), withPosition(defaultConfig));
export const showInfo = msg => toast.info(translate(msg), withPosition(defaultConfig));
export const showWarning = msg => toast.warn(translate(msg), withPosition(defaultConfig));
