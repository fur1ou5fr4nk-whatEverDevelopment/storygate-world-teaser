import { createProximityTracker } from "./demo-proximity.mjs";
import { getImageLayout } from "../teaser-layout.mjs";

(() => {
  const stage = document.querySelector("[data-demo-stage]");
  if (!stage) return;

  const backdrop = stage.querySelector("[data-demo-backdrop]");
  const phone = stage.querySelector("[data-demo-phone]");
  const target = stage.querySelector("[data-demo-target]");
  const status = stage.querySelector("[data-demo-status]");
  const instruction = stage.querySelector("[data-demo-instruction]");
  const mobileQuery = window.matchMedia("(max-width: 720px), (pointer: coarse)");
  let activePointerId = null;
  let dragStart = null;
  let tracker = null;
  let detected = false;

  function setTokenPosition() {
    if (!backdrop.naturalWidth || !backdrop.naturalHeight) return;

    const layout = getImageLayout({
      stageWidth: stage.clientWidth,
      stageHeight: stage.clientHeight,
      sourceWidth: backdrop.naturalWidth,
      sourceHeight: backdrop.naturalHeight,
    });
    const tokenX = layout.offsetX + 511.54400637196335 * layout.scale;
    const tokenY = layout.offsetY + 449.95061728395063 * layout.scale;
    const tokenSize = 390 * layout.scale;

    stage.style.setProperty("--sharp-left", layout.offsetX + "px");
    stage.style.setProperty("--sharp-top", layout.offsetY + "px");
    stage.style.setProperty("--sharp-width", layout.renderedWidth + "px");
    stage.style.setProperty("--sharp-height", layout.renderedHeight + "px");
    stage.style.setProperty("--token-x", tokenX + "px");
    stage.style.setProperty("--token-y", tokenY + "px");
    stage.style.setProperty("--token-size", tokenSize + "px");
  }

  function playDetectionChime() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.045, context.currentTime + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .34);
    gain.connect(context.destination);

    [523.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * .055);
      oscillator.stop(context.currentTime + .36);
    });
  }

  function completeDetection() {
    if (detected) return;
    detected = true;
    stage.dataset.phase = "detected";
    status.setAttribute("aria-hidden", "false");
    instruction.setAttribute("aria-hidden", "true");
    phone.dataset.i18nAriaLabel = "demo.detected";
    phone.setAttribute("aria-label", status.querySelector("strong")?.textContent || "StoryGate detected");
    phone.removeAttribute("tabindex");
    navigator.vibrate?.(22);
    playDetectionChime();
  }

  function updateApproach(point) {
    if (!tracker || !dragStart || detected) return;

    const state = tracker.update(point);
    stage.style.setProperty("--progress", state.progress.toFixed(4));

    if (!mobileQuery.matches) {
      let offsetX = point.x - dragStart.x;
      let offsetY = point.y - dragStart.y;
      if (state.progress > .68) {
        const targetRect = target.getBoundingClientRect();
        const targetPoint = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
        };
        const strength = Math.min(1, (state.progress - .68) / .32) * .16;
        offsetX += (targetPoint.x - point.x) * strength;
        offsetY += (targetPoint.y - point.y) * strength;
      }
      stage.style.setProperty("--phone-x", offsetX.toFixed(2) + "px");
      stage.style.setProperty("--phone-y", offsetY.toFixed(2) + "px");
    }

    if (state.phase === "detected") completeDetection();
  }

  function beginApproach(event) {
    if (detected || event.button > 0) return;
    if (!mobileQuery.matches && !phone.contains(event.target)) return;

    const targetRect = target.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    const mode = mobileQuery.matches ? "mobile" : "desktop";
    dragStart = start;
    tracker = createProximityTracker({
      mode,
      start,
      target: {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2,
      },
      travel: Math.min(220, stage.clientHeight * .28),
    });
    activePointerId = event.pointerId;
    stage.setPointerCapture?.(event.pointerId);
    updateApproach(start);
  }

  function moveApproach(event) {
    if (event.pointerId !== activePointerId) return;
    updateApproach({ x: event.clientX, y: event.clientY });
  }

  function endApproach(event) {
    if (event.pointerId !== activePointerId) return;
    stage.releasePointerCapture?.(event.pointerId);
    activePointerId = null;
  }

  function handleKeyboard(event) {
    if (detected || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    stage.style.setProperty("--progress", "1");
    completeDetection();
  }

  stage.dataset.mode = mobileQuery.matches ? "mobile" : "desktop";
  stage.addEventListener("pointerdown", beginApproach);
  stage.addEventListener("pointermove", moveApproach);
  stage.addEventListener("pointerup", endApproach);
  stage.addEventListener("pointercancel", endApproach);
  stage.addEventListener("keydown", handleKeyboard);

  if (backdrop.complete) setTokenPosition();
  else backdrop.addEventListener("load", setTokenPosition, { once: true });
  window.addEventListener("resize", setTokenPosition);
})();
