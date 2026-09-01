(() => {
  "use strict";

  const triggers = [...document.querySelectorAll(".layer-trigger")];
  const cards = [...document.querySelectorAll("[data-layer-card]")];
  const popoverHost = document.querySelector("#layer-popover-host");
  const library = document.querySelector("#layer-library");
  const responsiveQuery = window.matchMedia(
    "(max-width: 719px), (hover: none), (pointer: coarse)",
  );

  let activeTrigger = null;
  let activeCard = null;
  let pinned = false;
  let openTimer = 0;
  let closeTimer = 0;

  function usesInlineCard() {
    return responsiveQuery.matches;
  }

  function cardFor(trigger) {
    return cards.find((card) => card.dataset.layerCard === trigger.dataset.layer) || null;
  }

  function clearTimers() {
    window.clearTimeout(openTimer);
    window.clearTimeout(closeTimer);
    openTimer = 0;
    closeTimer = 0;
  }

  function positionDesktopCard() {
    if (!activeTrigger || !activeCard || usesInlineCard()) return;

    const edge = 16;
    const gap = 12;
    const triggerRect = activeTrigger.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;
    const placeAbove = cardRect.height > spaceBelow && spaceAbove > spaceBelow;
    const idealLeft = triggerRect.left + (triggerRect.width - cardRect.width) / 2;
    const maxLeft = Math.max(edge, window.innerWidth - cardRect.width - edge);
    const left = Math.min(Math.max(idealLeft, edge), maxLeft);
    const idealTop = placeAbove
      ? triggerRect.top - cardRect.height - gap
      : triggerRect.bottom + gap;
    const maxTop = Math.max(edge, window.innerHeight - cardRect.height - edge);
    const top = Math.min(Math.max(idealTop, edge), maxTop);

    activeCard.style.setProperty("--layer-left", `${Math.round(left)}px`);
    activeCard.style.setProperty("--layer-top", `${Math.round(top)}px`);
  }

  function moveActiveCard() {
    if (!activeTrigger || !activeCard) return;

    if (usesInlineCard()) {
      const slot = activeTrigger
        .closest(".story-block")
        ?.querySelector(".story-block__layer-slot");

      if (slot) {
        activeCard.style.position = "static";
        activeCard.style.width = "100%";
        activeCard.style.marginTop = "1.5rem";
        slot.append(activeCard);
      }
      return;
    }

    activeCard.style.removeProperty("position");
    activeCard.style.removeProperty("width");
    activeCard.style.removeProperty("margin-top");
    popoverHost.append(activeCard);
    positionDesktopCard();
  }

  function openLayer(trigger, { pin = false } = {}) {
    const card = cardFor(trigger);
    if (!card) return;

    clearTimers();

    if (activeTrigger === trigger && activeCard === card) {
      pinned = pin || pinned;
      moveActiveCard();
      return;
    }

    if (activeCard) closeLayer();

    activeTrigger = trigger;
    activeCard = card;
    pinned = pin;

    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute("aria-describedby", card.id);
    card.hidden = false;
    card.setAttribute("aria-hidden", "false");
    moveActiveCard();
  }

  function closeLayer({ restoreFocus = false } = {}) {
    clearTimers();
    if (!activeTrigger || !activeCard) return;

    const trigger = activeTrigger;
    const card = activeCard;

    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-describedby");
    card.setAttribute("aria-hidden", "true");
    card.hidden = true;
    card.style.removeProperty("--layer-left");
    card.style.removeProperty("--layer-top");
    card.style.removeProperty("position");
    card.style.removeProperty("width");
    card.style.removeProperty("margin-top");
    library.append(card);

    if (restoreFocus) trigger.focus({ preventScroll: true });

    activeTrigger = null;
    activeCard = null;
    pinned = false;
  }

  function scheduleOpen(trigger) {
    if (trigger === activeTrigger) {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
    }

    if (
      usesInlineCard()
      || !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    window.clearTimeout(openTimer);
    openTimer = window.setTimeout(() => {
      openTimer = 0;
      if (
        !trigger.isConnected
        || !trigger.matches(":hover")
        || usesInlineCard()
        || !window.matchMedia("(hover: hover) and (pointer: fine)").matches
      ) {
        return;
      }
      openLayer(trigger);
    }, 150);
  }

  function scheduleClose() {
    window.clearTimeout(openTimer);
    openTimer = 0;
    if (!activeTrigger || !activeCard || pinned) return;

    const owner = activeTrigger;
    const card = activeCard;

    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      if (
        activeTrigger !== owner
        || activeCard !== card
        || pinned
        || owner.matches(":hover")
        || card.matches(":hover")
        || document.activeElement === owner
        || card.contains(document.activeElement)
      ) {
        return;
      }
      closeLayer();
    }, 180);
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("pointerenter", () => scheduleOpen(trigger));
    trigger.addEventListener("pointerleave", () => {
      if (trigger === activeTrigger) scheduleClose();
    });

    trigger.addEventListener("focus", () => {
      if (activeTrigger === trigger && activeCard === cardFor(trigger)) return;
      openLayer(trigger);
    });

    trigger.addEventListener("blur", () => {
      const card = activeCard;

      queueMicrotask(() => {
        if (
          trigger !== activeTrigger
          || card !== activeCard
          || !card
          || pinned
          || document.activeElement === trigger
          || trigger.matches(":hover")
          || card.contains(document.activeElement)
          || card.matches(":hover")
        ) {
          return;
        }

        closeLayer();
      });
    });

    trigger.addEventListener("click", () => {
      const card = cardFor(trigger);

      if (activeTrigger === trigger && activeCard === card && pinned) {
        closeLayer();
        return;
      }

      openLayer(trigger, { pin: true });
    });
  });

  cards.forEach((card) => {
    card.addEventListener("pointerenter", () => {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
    });
    card.addEventListener("pointerleave", scheduleClose);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!activeTrigger || !activeCard) return;

    const target = event.target;
    if (activeTrigger.contains(target) || activeCard.contains(target)) return;

    closeLayer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeCard) return;

    event.preventDefault();
    closeLayer({ restoreFocus: true });
  });

  window.addEventListener("resize", moveActiveCard);
  responsiveQuery.addEventListener("change", moveActiveCard);
})();
