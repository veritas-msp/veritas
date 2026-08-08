import { createLocaleGetter } from "../../i18n/translate";
const ADMIN_NOTIFICATIONS_HUB_COPY = {
  fr: {
    tabs: {
      inapp: "In-app",
      events: "Événements",
      webhooks: "Webhooks"
    }
  },
  en: {
    tabs: {
      inapp: "In-app",
      events: "Events",
      webhooks: "Webhooks"
    }
  },
  de: {
    tabs: {
      inapp: "In-App",
      events: "Ereignisse",
      webhooks: "Webhooks"
    }
  },
  it: {
    tabs: {
      inapp: "In-app",
      events: "Eventi",
      webhooks: "Webhook"
    }
  },
  es: {
    tabs: {
      inapp: "In-app",
      events: "Eventos",
      webhooks: "Webhooks"
    }
  }
};
export const getAdminNotificationsHubCopy = createLocaleGetter(ADMIN_NOTIFICATIONS_HUB_COPY);
