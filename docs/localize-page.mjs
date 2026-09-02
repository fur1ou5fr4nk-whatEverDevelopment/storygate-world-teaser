import { initializeLocalization } from "./i18n.mjs";

try {
  initializeLocalization({ document, window });
} finally {
  document.documentElement.removeAttribute("data-localization");
}
