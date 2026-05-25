import { createI18n } from "vue-i18n";
import en from "./locales/en.js";
import de from "./locales/de.js";
import fr from "./locales/fr.js";
import es from "./locales/es.js";
import nl from "./locales/nl.js";
import el from "./locales/el.js";

const browserLocale = navigator.language?.slice(0, 2) ?? "en";
const supportedLocales = ["en", "de", "fr", "es", "nl", "el"];
const defaultLocale = supportedLocales.includes(browserLocale) ? browserLocale : "en";

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: "en",
  messages: { en, de, fr, es, nl, el },
});
