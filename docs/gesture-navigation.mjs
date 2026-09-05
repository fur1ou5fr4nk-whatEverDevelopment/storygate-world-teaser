export function installGestureNavigation({ stage, cue, onNext, onPrevious, blockedReason = "Not available yet" }) {
  let start = null;
  let active = false;
  const setCue = (visible, direction = "neutral") => {
    if (!cue) return;
    stage.dataset.gestureActive = visible ? "true" : "false";
    cue.setAttribute("aria-hidden", visible ? "false" : "true");
    if (!visible) return;
    const icon = cue.querySelector("[data-gesture-icon]");
    const message = cue.querySelector("[data-gesture-message]");
    if (direction === "next") { icon.textContent = "←"; message.textContent = "Next Step"; }
    else if (direction === "previous") { icon.textContent = "→"; message.textContent = "Previous Step"; }
    else if (direction === "blocked") { icon.textContent = "⌑"; message.textContent = blockedReason; }
    else { icon.textContent = "↔"; message.textContent = "Swipe to navigate"; }
  };
  stage.addEventListener("pointerdown", (event) => {
    if (event.button > 0) return;
    start = { x: event.clientX, y: event.clientY };
    active = true;
  });
  stage.addEventListener("pointermove", (event) => {
    if (!active || !start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 18) setCue(true, dx < 0 ? "next" : "previous");
  });
  stage.addEventListener("pointerup", (event) => {
    if (!active || !start) return;
    const dx = event.clientX - start.x;
    active = false;
    start = null;
    if (dx < -52) { const allowed = onNext?.(); setCue(true, allowed === false ? "blocked" : "next"); }
    else if (dx > 52) { const allowed = onPrevious?.(); setCue(true, allowed === false ? "blocked" : "previous"); }
    else setCue(false);
  });
  stage.addEventListener("pointercancel", () => { active = false; start = null; setCue(false); });
}
