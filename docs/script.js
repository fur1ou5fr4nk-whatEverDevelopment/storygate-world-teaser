(() => {
  const stage = document.getElementById("portal");
  if (!stage) return;

  const gate = stage.querySelector(".gate");
  const image = stage.querySelector(".portal-image--sharp");
  const finalCopy = stage.querySelector(".final-copy");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focusDuration = reducedMotion ? 40 : 2250;
  const messageDuration = reducedMotion ? 40 : 10000;
  let messageIdleTimer;

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
    const phase = Number(stage.dataset.phase || "0");

    if (phase === 0) {
      stage.dataset.phase = "1";
      stage.classList.add("is-deblurring");
      window.setTimeout(() => {
        stage.classList.remove("is-deblurring");
        stage.classList.add("is-clear");
        stage.dataset.ready = "true";
        if (stage.dataset.pendingMessage === "true") revealMessage();
      }, focusDuration);
      return;
    }

    if (phase === 1) {
      stage.dataset.phase = "2";
      if (stage.dataset.ready === "true") {
        revealMessage();
      } else {
        stage.dataset.pendingMessage = "true";
      }
      return;
    }

    if (phase === 2) {
      stage.dataset.phase = "3";
      window.clearTimeout(messageIdleTimer);
      stage.classList.remove("is-message-idle");
      stage.classList.add("is-third-act");
    }
  }

  function positionGate() {
    if (!image.naturalWidth || !image.naturalHeight) return;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const scale = Math.max(stageWidth / image.naturalWidth, stageHeight / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const offsetX = (stageWidth - renderedWidth) / 2;
    const offsetY = (stageHeight - renderedHeight) / 2;

    const sourceCenterX = 511.54400637196335;
    const sourceCenterY = 449.95061728395063;
    const sourceDiameter = 56.5;

    const gateX = offsetX + sourceCenterX * scale;
    const gateY = offsetY + sourceCenterY * scale;
    const gateSize = sourceDiameter * scale;
    const textSafetyGap = Math.max(24, Math.min(38, stageWidth * .03));
    const finalCopyTop = finalCopy.getBoundingClientRect().top - stage.getBoundingClientRect().top;

    stage.style.setProperty("--gate-x", gateX + "px");
    stage.style.setProperty("--gate-y", gateY + "px");
    stage.style.setProperty("--gate-size", gateSize + "px");
    stage.style.setProperty("--text-safe-top", gateY + gateSize / 2 + textSafetyGap + "px");
    stage.style.setProperty("--message-anchor-top", finalCopyTop + "px");
  }

  gate.addEventListener("click", advance);
  if (image.complete) positionGate();
  else image.addEventListener("load", positionGate, { once: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(positionGate).observe(stage);
  } else {
    window.addEventListener("resize", positionGate);
  }
})();
