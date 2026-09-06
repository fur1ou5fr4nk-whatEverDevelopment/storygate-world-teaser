import { createDemoFlow, isStoryLayerVisible } from "./demo-flow.mjs";
import { createProximityTracker } from "./demo-proximity.mjs";
import { getImageLayout } from "../teaser-layout.mjs";

(() => {
  const stage = document.querySelector("[data-demo-stage]");
  if (!stage) return;

  const backdrop = stage.querySelector("[data-demo-backdrop]");
  const phone = stage.querySelector("[data-demo-phone]");
  const target = stage.querySelector("[data-demo-target]");
  const screen = stage.querySelector("[data-demo-screen]");
  const nfc = stage.querySelector("[data-demo-nfc]");
  const entry = stage.querySelector("[data-demo-entry]");
  const countdown = stage.querySelector("[data-demo-countdown]");
  const story = stage.querySelector("[data-demo-story]");
  const instruction = stage.querySelector("[data-demo-instruction]");
  const openButton = stage.querySelector("[data-demo-open]");
  const beginButton = stage.querySelector("[data-demo-begin]");
  const count = stage.querySelector("[data-demo-count]");
  const live = stage.querySelector("[data-demo-live]");
  const gestureCue = stage.querySelector("[data-gesture-cue]");
  const gestureIcon = gestureCue?.querySelector("[data-gesture-icon]");
  const gestureMessage = gestureCue?.querySelector("[data-gesture-message]");
  const storyLayers = [...stage.querySelectorAll("[data-story-layer]")];
  const revealButtons = [...stage.querySelectorAll("[data-demo-reveal]")];
  const mobileQuery = window.matchMedia("(max-width: 720px), (pointer: coarse)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const flow = createDemoFlow();
  let activePointerId = null;
  let dragStart = null;
  let tracker = null;
  let countdownTimer = null;
  let navigationPointerStart = null;
  let navigationPointerId = null;
  let gestureTimer = null;

  function isApproaching() {
    return flow.snapshot().phase === "approach";
  }

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

  function setVisible(element, visible) {
    element.hidden = !visible;
    element.setAttribute("aria-hidden", String(!visible));
  }

  function announce(message) {
    if (live) live.textContent = message;
  }

  function showGestureCue(direction, allowed = true) {
    if (!gestureCue || !gestureIcon || !gestureMessage) return;
    gestureIcon.textContent = direction === "next" ? "←" : direction === "previous" ? "→" : "⌑";
    gestureMessage.textContent = allowed
      ? direction === "next" ? "Next step" : "Previous step"
      : direction === "next" ? "End of story" : "Back to the Gate";
    stage.dataset.gestureActive = "true";
    window.clearTimeout(gestureTimer);
    gestureTimer = window.setTimeout(() => { stage.dataset.gestureActive = "false"; }, 1500);
  }

  function render() {
    const state = flow.snapshot();
    const isDetected = state.phase !== "approach";
    stage.dataset.phase = state.phase;
    document.body.dataset.demoPhase = state.phase;
    screen.dataset.phase = state.phase;
    setVisible(nfc, state.phase === "nfc");
    setVisible(entry, state.phase === "entry");
    setVisible(countdown, state.phase === "countdown");
    setVisible(story, state.phase === "story");
    count.textContent = String(state.countdown || 1);

    for (const layer of storyLayers) {
      const index = Number(layer.dataset.storyLayer);
      setVisible(layer, isStoryLayerVisible(state, index));
    }

    if (state.phase !== "story") {
      story.style.setProperty("--story-drag-x", "0px");
      story.removeAttribute("data-story-dragging");
    }

    instruction.setAttribute("aria-hidden", String(isDetected));
    if (isDetected) {
      phone.removeAttribute("role");
      phone.removeAttribute("tabindex");
      phone.removeAttribute("aria-describedby");
      phone.removeAttribute("aria-label");
      delete phone.dataset.i18nAriaLabel;
    } else {
      phone.setAttribute("role", "button");
      phone.setAttribute("tabindex", "0");
      phone.setAttribute("aria-describedby", "demo-assist");
      phone.dataset.i18nAriaLabel = "demo.phoneLabel";
    }
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

    window.setTimeout(() => context.close().catch(() => {}), 600);
  }

  function completeDetection() {
    if (!isApproaching()) return;
    flow.dispatch("DETECTED");
    stage.style.setProperty("--progress", "1");
    render();
    navigator.vibrate?.(22);
    playDetectionChime();
    announce(nfc.querySelector("strong")?.textContent || "Item Detected");
  }

  function updateApproach(point) {
    if (!tracker || !dragStart || !isApproaching()) return;

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
    if (!isApproaching() || event.button > 0) return;
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
    if (dragStart && isApproaching()) {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      if (dx > 52 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        window.location.href = "../?skipIntro=1";
      }
    }
  }

  function handleKeyboard(event) {
    if (!isApproaching() || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    stage.style.setProperty("--progress", "1");
    completeDetection();
  }

  function clearCountdown() {
    if (countdownTimer !== null) window.clearTimeout(countdownTimer);
    countdownTimer = null;
  }

  function advanceCountdown() {
    clearCountdown();
    if (flow.snapshot().phase !== "countdown") return;
    const delay = reducedMotionQuery.matches ? 320 : 760;
    countdownTimer = window.setTimeout(() => {
      flow.dispatch("TICK");
      render();
      if (flow.snapshot().phase === "countdown") {
        advanceCountdown();
      } else {
        announce(story.querySelector("[data-story-layer='1'] p")?.textContent || "");
        story.querySelector("[data-demo-reveal]")?.focus({ preventScroll: true });
      }
    }, delay);
  }

  openButton.addEventListener("click", () => {
    if (flow.snapshot().phase !== "nfc") return;
    flow.dispatch("OPEN");
    render();
    announce(entry.querySelector("h2")?.textContent || "");
    beginButton.focus({ preventScroll: true });
  });

  beginButton.addEventListener("click", () => {
    if (flow.snapshot().phase !== "entry") return;
    flow.dispatch("BEGIN_STORY");
    render();
    advanceCountdown();
  });

  for (const button of revealButtons) {
    button.addEventListener("click", () => {
      if (flow.snapshot().phase !== "story") return;
      flow.dispatch("REVEAL_LAYER");
      render();
      const nextLayer = flow.snapshot().storyLayer;
      announce(story.querySelector(`[data-story-layer="${nextLayer}"] p`)?.textContent || "");
      story.querySelector(`[data-story-layer="${nextLayer}"] [data-demo-reveal]`)?.focus({ preventScroll: true });
    });
  }

  function navigateStory(eventName) {
    if (flow.snapshot().phase !== "story") return;
    const before = flow.snapshot().storyLayer;
    flow.dispatch(eventName);
    const after = flow.snapshot().storyLayer;
    render();
    if (after === before) {
      announce(eventName === "NEXT_STEP" ? "End of story" : "Beginning of story");
      return;
    }
    const layer = story.querySelector(`[data-story-layer="${after}"]`);
    announce(layer?.querySelector("p")?.textContent || "");
    layer?.querySelector("[data-demo-reveal]")?.focus({ preventScroll: true });
  }

  function navigatePreviousPhase() {
    const before = flow.snapshot();
    if (before.phase === "approach") {
      window.location.href = "../?skipIntro=1";
      return;
    }
    flow.dispatch("PREVIOUS_STEP");
    const after = flow.snapshot();
    if (before.phase === "countdown") clearCountdown();
    render();
    if (after.phase === "approach") {
      stage.style.setProperty("--progress", "0");
      stage.style.setProperty("--phone-x", "0px");
      stage.style.setProperty("--phone-y", "0px");
      announce(instruction.textContent || "");
    } else if (after.phase === "nfc") {
      announce(nfc.querySelector("strong")?.textContent || "Item Detected");
    } else if (after.phase === "entry") {
      announce(entry.querySelector("h2")?.textContent || "");
    }
    showGestureCue("previous", after.phase !== before.phase);
  }

  function navigateNextPhase() {
    const phase = flow.snapshot().phase;
    if (phase === "story") return navigateStory("NEXT_STEP");
    if (phase === "nfc") openButton.click();
    else if (phase === "entry") beginButton.click();
    else showGestureCue("next", false);
  }

  stage.addEventListener("pointerdown", (event) => {
    if (!mobileQuery.matches || event.pointerType !== "touch" || flow.snapshot().phase === "approach") return;
    navigationPointerStart = { x: event.clientX, y: event.clientY };
    navigationPointerId = event.pointerId;
    stage.setPointerCapture?.(event.pointerId);
    if (flow.snapshot().phase === "story") {
      story.dataset.storyDragging = "true";
    }
  });
  stage.addEventListener("pointermove", (event) => {
    if (event.pointerId !== navigationPointerId || !navigationPointerStart || flow.snapshot().phase !== "story") return;
    const dx = Math.max(-120, Math.min(120, event.clientX - navigationPointerStart.x));
    const dy = Math.abs(event.clientY - navigationPointerStart.y);
    if (Math.abs(dx) > dy) story.style.setProperty("--story-drag-x", `${dx}px`);
  });
  stage.addEventListener("pointerup", (event) => {
    if (event.pointerId !== navigationPointerId || !navigationPointerStart) return;
    const deltaX = event.clientX - navigationPointerStart.x;
    const deltaY = event.clientY - navigationPointerStart.y;
    navigationPointerStart = null;
    navigationPointerId = null;
    story.style.setProperty("--story-drag-x", "0px");
    story.removeAttribute("data-story-dragging");
    stage.releasePointerCapture?.(event.pointerId);
    if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    event.preventDefault();
    if (deltaX < 0) {
      const before = flow.snapshot();
      navigateNextPhase();
      showGestureCue("next", flow.snapshot().phase !== before.phase || flow.snapshot().storyLayer !== before.storyLayer);
    } else if (flow.snapshot().phase === "story") {
      const before = flow.snapshot();
      navigateStory("PREVIOUS_STEP");
      showGestureCue("previous", flow.snapshot().phase !== before.phase || flow.snapshot().storyLayer !== before.storyLayer);
    }
    else navigatePreviousPhase();
  });
  stage.addEventListener("pointercancel", () => {
    navigationPointerStart = null;
    navigationPointerId = null;
    story.style.setProperty("--story-drag-x", "0px");
    story.removeAttribute("data-story-dragging");
  });

  stage.dataset.mode = mobileQuery.matches ? "mobile" : "desktop";
  stage.addEventListener("pointerdown", beginApproach);
  stage.addEventListener("pointermove", moveApproach);
  stage.addEventListener("pointerup", endApproach);
  stage.addEventListener("pointercancel", endApproach);
  stage.addEventListener("keydown", handleKeyboard);
  stage.addEventListener("dragstart", (event) => event.preventDefault());

  let stageSwipeStart = null;
  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType && event.pointerType !== "touch") return;
    if (event.button > 0) return;
    stageSwipeStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  stage.addEventListener("pointerup", (event) => {
    if (!stageSwipeStart) return;
    const dx = event.clientX - stageSwipeStart.x;
    const dy = event.clientY - stageSwipeStart.y;
    stageSwipeStart = null;
    if (dx > 52 && Math.abs(dx) > Math.abs(dy) * 1.2 && isApproaching()) {
      window.location.href = "../?skipIntro=1";
    }
  }, { passive: true });

  stage.addEventListener("pointercancel", () => {
    stageSwipeStart = null;
  }, { passive: true });

  if (backdrop.complete) setTokenPosition();
  else backdrop.addEventListener("load", setTokenPosition, { once: true });
  window.addEventListener("resize", setTokenPosition);
  window.addEventListener("beforeunload", clearCountdown, { once: true });
  render();
})();
