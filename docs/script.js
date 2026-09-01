import { createDiscoveryTracker } from "./discovery-state.mjs";
import { getNextRevealStep, getRevealTimings } from "./reveal-flow.mjs";
import { getImageLayout, getLowerCopyCenter } from "./teaser-layout.mjs";

(() => {
  const stage = document.getElementById("portal");
  if (!stage) return;

  const gate = stage.querySelector(".gate");
  const image = stage.querySelector(".portal-image--sharp");
  const wordmark = stage.querySelector(".wordmark");
  const finalCopy = stage.querySelector(".final-copy");
  const primaryDiscoveryButtons = Array.from(stage.querySelectorAll("[data-discovery-id]"));
  const biographyDiscovery = stage.querySelector("[data-biography-discovery]");
  const biographyButton = stage.querySelector("[data-biography-star]");
  const discoveryTracker = createDiscoveryTracker(primaryDiscoveryButtons.map((button) => button.dataset.discoveryId));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const {
    focusDuration,
    messageDuration,
    discoveryDelay,
    biographyDelay,
  } = getRevealTimings({ reducedMotion });
  let messageIdleTimer;
  let discoveryReadyTimer;

  function setDiscoveryReady(discovery) {
    const button = discovery.querySelector(".discovery-star");
    discovery.classList.add("is-ready");
    discovery.removeAttribute("aria-hidden");
    button.disabled = false;
    button.removeAttribute("aria-hidden");
  }

  function revealDiscovery(button) {
    const discovery = button.closest(".discovery");
    const card = discovery.querySelector("[data-discovery-card]");

    discovery.classList.add("is-found", "is-open");
    button.setAttribute("aria-expanded", "true");
    card.setAttribute("aria-hidden", "false");
    card.tabIndex = 0;
  }

  function unlockBiographyDiscovery() {
    setDiscoveryReady(biographyDiscovery);
    stage.classList.add("has-biography-discovery");
  }

  function findPrimaryDiscovery(event) {
    const button = event.currentTarget;
    const result = discoveryTracker.find(button.dataset.discoveryId);

    revealDiscovery(button);
    if (result.allFound && !stage.classList.contains("has-found-both")) {
      stage.classList.add("has-found-both");
      window.setTimeout(unlockBiographyDiscovery, biographyDelay);
    }
  }

  function preparePrimaryDiscoveries() {
    stage.classList.add("is-discovery-ready");
    finalCopy.setAttribute("aria-hidden", "true");
    primaryDiscoveryButtons.forEach((button) => setDiscoveryReady(button.closest(".discovery")));
  }

  function revealMessage() {
    stage.classList.remove("is-clear", "is-message-idle");
    stage.classList.add("has-message");
    stage.dataset.pendingMessage = "false";
    window.clearTimeout(messageIdleTimer);
    messageIdleTimer = window.setTimeout(() => {
      if (stage.dataset.phase === "2" && stage.classList.contains("has-message")) {
        stage.classList.add("is-message-idle");
      }
    }, messageDuration);
  }

  function advance() {
    const step = getNextRevealStep(stage.dataset.phase || "0");
    stage.dataset.phase = String(step.phase);

    if (step.action === "focus") {
      stage.classList.add("is-deblurring");
      window.setTimeout(() => {
        stage.classList.remove("is-deblurring");
        stage.classList.add("is-clear");
        stage.dataset.ready = "true";
        if (stage.dataset.pendingMessage === "true") revealMessage();
      }, focusDuration);
      return;
    }

    if (step.action === "message") {
      if (stage.dataset.ready === "true") {
        revealMessage();
      } else {
        stage.dataset.pendingMessage = "true";
      }
      return;
    }

    if (step.action === "still") {
      window.clearTimeout(messageIdleTimer);
      stage.classList.remove("is-message-idle");
      stage.classList.add("is-still-prompt");
      return;
    }

    if (step.action === "final") {
      stage.classList.add("is-final-act");
      window.clearTimeout(discoveryReadyTimer);
      discoveryReadyTimer = window.setTimeout(preparePrimaryDiscoveries, discoveryDelay);
    }
  }

  function positionGate() {
    if (!image.naturalWidth || !image.naturalHeight) return;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const {
      mode,
      scale,
      renderedWidth,
      renderedHeight,
      offsetX,
      offsetY,
    } = getImageLayout({
      stageWidth,
      stageHeight,
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
    });

    const sourceCenterX = 511.54400637196335;
    const sourceCenterY = 449.95061728395063;
    const sourceDiameter = 56.5;

    const gateX = offsetX + sourceCenterX * scale;
    const gateY = offsetY + sourceCenterY * scale;
    const gateSize = sourceDiameter * scale;
    const textSafetyGap = Math.max(24, Math.min(38, stageWidth * .03));
    const stageRect = stage.getBoundingClientRect();
    const wordmarkRect = wordmark.getBoundingClientRect();

    const setImagePoint = (name, sourceX, sourceY) => {
      stage.style.setProperty(`--${name}-x`, offsetX + sourceX * scale + "px");
      stage.style.setProperty(`--${name}-y`, offsetY + sourceY * scale + "px");
    };

    stage.style.setProperty("--gate-x", gateX + "px");
    stage.style.setProperty("--gate-y", gateY + "px");
    stage.style.setProperty("--gate-size", gateSize + "px");
    stage.style.setProperty("--sharp-image-left", offsetX + "px");
    stage.style.setProperty("--sharp-image-top", offsetY + "px");
    stage.style.setProperty("--sharp-image-width", renderedWidth + "px");
    stage.style.setProperty("--sharp-image-height", renderedHeight + "px");
    stage.style.setProperty("--text-safe-top", gateY + gateSize / 2 + textSafetyGap + "px");
    stage.style.setProperty("--lower-copy-center", getLowerCopyCenter({ gateY, stageHeight }) + "px");
    stage.classList.add("has-image-layout");
    stage.classList.toggle("is-token-fit", mode === "token-fit");
    setImagePoint("storygate-detail", 690, 315);
    setImagePoint("demo-detail", 374, 625);
    stage.style.setProperty("--biography-detail-x", wordmarkRect.left - stageRect.left + wordmarkRect.width * .84 + "px");
    stage.style.setProperty("--biography-detail-y", wordmarkRect.top - stageRect.top + wordmarkRect.height * .52 + "px");
  }

  gate.addEventListener("click", advance);
  primaryDiscoveryButtons.forEach((button) => button.addEventListener("click", findPrimaryDiscovery));
  biographyButton.addEventListener("click", () => revealDiscovery(biographyButton));
  if (image.complete) positionGate();
  else image.addEventListener("load", positionGate, { once: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(positionGate).observe(stage);
  } else {
    window.addEventListener("resize", positionGate);
  }
})();
