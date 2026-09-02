(() => {
  const root = document.documentElement;
  root.dataset.localization = "pending";

  window.setTimeout(() => {
    root.removeAttribute("data-localization");
  }, 2000);
})();
