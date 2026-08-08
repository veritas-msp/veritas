const LEGACY_MESSAGE_TO_CODE = {
  "Unable to lire l'état d'installation.": "SETUP_STATUS_READ_FAILED",
  "Unable d'écrire le fichier .env.": "SETUP_ENV_WRITE_FAILED",
  "Login à la base de data impossible.": "SETUP_DB_CONNECTION_FAILED",
  "Unable to lire les migrations.": "SETUP_MIGRATIONS_LIST_FAILED",
  "Failed tos migrations.": "SETUP_MIGRATION_FAILED",
  "Un administrateur existe déjà.": "SETUP_ADMIN_ALREADY_EXISTS",
  "Unable to créer le compte administrateur.": "SETUP_ADMIN_CREATE_FAILED",
  "L'assistant d'installation est déjà terminé.": "SETUP_ALREADY_COMPLETE",
  "Error réseau": "NETWORK_ERROR",
  "Network error": "NETWORK_ERROR"
};
export function resolveSetupError(err, t) {
  const errors = t?.errors || {};
  const code = err?.code || (err?.message ? LEGACY_MESSAGE_TO_CODE[err.message] : null) || null;
  if (code && errors[code]) {
    if (code === "SETUP_MIGRATION_FAILED" && err?.message && err.message !== "Database preparation failed." && err.message !== errors[code]) {
      return err.message;
    }
    return errors[code];
  }
  if (errors.generic) {
    return errors.generic;
  }
  return err?.message || "Error";
}
