import { initializeLocalization, loadPreviewCatalogues } from "./i18n.mjs";

const catalogMap = await loadPreviewCatalogues(window.location);
initializeLocalization({ document, window, catalogMap });
