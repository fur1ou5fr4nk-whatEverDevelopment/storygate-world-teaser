import { initializeLocalization, loadPreviewCatalogues } from "./i18n.mjs";

try {
  const catalogMap = await loadPreviewCatalogues(window.location);
  initializeLocalization({ document, window, catalogMap });
} finally {
  document.documentElement.removeAttribute("data-localization");
}
