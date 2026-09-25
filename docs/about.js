(() => {
  "use strict";

  const root = document.querySelector(".about-page");
  if (!root) return;

  const storyBlocks = [...root.querySelectorAll(".biography > .story-block:not(.story-block--status)")];
  const statusBlock = root.querySelector(".story-block--status");
  const prevBtn = root.querySelector("[data-step-prev]");
  const nextBtn = root.querySelector("[data-step-next]");
  const currentEl = root.querySelector("[data-step-current]");
  const totalEl = root.querySelector("[data-step-total]");
  const dots = [...root.querySelectorAll(".about-stepper__dot")];

  if (!storyBlocks.length) return;

  if (totalEl) totalEl.textContent = String(storyBlocks.length);

  let currentStep = 0;

  function parseHashStep() {
    const hash = window.location.hash;
    const match = hash.match(/^#step-(\d+)$/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < storyBlocks.length) return idx;
    }
    return 0;
  }

  function createTapRipple(block, event) {
    if (!document.createElement || !block.getBoundingClientRect) return;
    try {
      const rect = block.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "about-tap-ripple";
      const x = (event.clientX || (rect.left + rect.width / 2)) - rect.left;
      const y = (event.clientY || (rect.top + rect.height / 2)) - rect.top;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      block.appendChild(ripple);
      setTimeout(() => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 500);
    } catch {
      // Graceful fallback if DOM methods are unavailable
    }
  }

  function setStep(index, { focus = false, updateUrl = true, direction, stage } = {}) {
    if (index < 0 || index >= storyBlocks.length) return;

    if (stage) {
      root.dataset.stage = stage;
    } else if (focus || index > 0 || updateUrl) {
      root.dataset.stage = "content";
    }

    const dir = direction || (index >= currentStep ? "forward" : "backward");
    currentStep = index;

    // Close any open layer popovers
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    storyBlocks.forEach((block, idx) => {
      const isActive = idx === currentStep;
      block.dataset.active = isActive ? "true" : "false";
      block.dataset.direction = dir;
      block.classList.toggle("is-active", isActive);

      if (isActive) {
        block.removeAttribute("hidden");
        block.setAttribute("aria-current", "step");
        if (focus) {
          const intro = block.querySelector(".story-block__intro") || block;
          intro.setAttribute("tabindex", "-1");
          intro.focus({ preventScroll: true });
        }
      } else {
        block.removeAttribute("aria-current");
        // Close details in inactive block so returning displays the intro first
        const details = block.querySelector(".story-block__details");
        if (details && details.open) details.removeAttribute("open");

        try {
          block.hidden = "until-found";
        } catch {
          block.hidden = true;
        }
      }
    });

    if (statusBlock) {
      const showStatus = currentStep === storyBlocks.length - 1;
      statusBlock.dataset.active = showStatus ? "true" : "false";
      statusBlock.classList.toggle("is-active", showStatus);
      if (showStatus) {
        statusBlock.removeAttribute("hidden");
      } else {
        statusBlock.hidden = true;
      }
    }

    if (currentEl) {
      currentEl.textContent = String(currentStep + 1);
    }

    dots.forEach((dot, idx) => {
      const isActive = idx === currentStep;
      const isCompleted = idx < currentStep;
      dot.classList.toggle("is-active", isActive);
      dot.classList.toggle("is-completed", isCompleted);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
      dot.tabIndex = isActive ? 0 : -1;
    });

    if (prevBtn) {
      prevBtn.disabled = currentStep === 0;
      prevBtn.setAttribute("aria-disabled", currentStep === 0 ? "true" : "false");
    }

    if (nextBtn) {
      nextBtn.disabled = currentStep === storyBlocks.length - 1;
      nextBtn.setAttribute("aria-disabled", currentStep === storyBlocks.length - 1 ? "true" : "false");
    }

    if (updateUrl) {
      const newHash = `#step-${currentStep + 1}`;
      if (window.location.hash !== newHash) {
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
      }
    }
  }

  // Handle Find-in-page match
  storyBlocks.forEach((block, idx) => {
    block.addEventListener("beforematch", () => {
      setStep(idx);
    });

    // Modern click-to-advance on readable story block
    block.addEventListener("click", (event) => {
      if (idx !== currentStep) return;
      if (window.getSelection && window.getSelection().toString().trim().length > 0) return;

      const target = event.target;
      if (target && typeof target.closest === "function") {
        if (target.closest("a, button, summary, input, textarea, select, [role='button'], [role='tab']")) {
          return;
        }
        if (target.closest(".story-block__expanded")) {
          return;
        }
      }

      // Edge tap: left 20% on desktop/touch goes back if past step 0
      if (typeof block.getBoundingClientRect === "function" && event.clientX) {
        const rect = block.getBoundingClientRect();
        if (event.clientX < rect.left + rect.width * 0.2 && currentStep > 0) {
          setStep(currentStep - 1, { focus: true, direction: "backward" });
          return;
        }
      }

      if (currentStep < storyBlocks.length - 1) {
        createTapRipple(block, event);
        setStep(currentStep + 1, { focus: true, direction: "forward" });
      }
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", () => setStep(currentStep - 1, { focus: true, direction: "backward" }));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => setStep(currentStep + 1, { focus: true, direction: "forward" }));
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => setStep(idx, { focus: true, direction: idx >= currentStep ? "forward" : "backward" }));
  });

  const stepper = root.querySelector(".about-stepper");
  if (stepper) {
    stepper.addEventListener("pointerdown", (event) => event.stopPropagation());
    stepper.addEventListener("pointerup", (event) => event.stopPropagation());
  }

  // Keyboard navigation
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea") return;

    if (event.key === "ArrowRight" || event.key === "PageDown") {
      if (currentStep < storyBlocks.length - 1) {
        event.preventDefault();
        setStep(currentStep + 1, { focus: true, direction: "forward" });
      }
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      if (currentStep > 0) {
        event.preventDefault();
        setStep(currentStep - 1, { focus: true, direction: "backward" });
      }
    } else if (event.key === " " && tag !== "button" && tag !== "summary") {
      if (event.shiftKey) {
        if (currentStep > 0) {
          event.preventDefault();
          setStep(currentStep - 1, { focus: true, direction: "backward" });
        }
      } else if (currentStep < storyBlocks.length - 1) {
        event.preventDefault();
        setStep(currentStep + 1, { focus: true, direction: "forward" });
      }
    }
  });

  // Real-time touch & pointer gesture tracking with tactile drag and snap
  let dragStart = null;
  let isDragging = false;
  let activeCard = null;

  document.addEventListener("pointerdown", (event) => {
    if (event.button > 0) return;
    const target = event.target;
    if (target && typeof target.closest === "function") {
      if (target.closest("a, button, summary, input, textarea, select, [role='button'], [role='tab'], .story-block__expanded")) {
        return;
      }
    }
    const currentBlock = storyBlocks[currentStep];
    if (currentBlock && target && typeof currentBlock.contains === "function" && currentBlock.contains(target)) {
      activeCard = currentBlock;
    } else {
      activeCard = currentBlock || null;
    }
    dragStart = { x: event.clientX, y: event.clientY, time: Date.now() };
    isDragging = false;
  }, { passive: true });

  document.addEventListener("pointermove", (event) => {
    if (!dragStart || !activeCard) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;

    if (!isDragging) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        isDragging = true;
        if (activeCard.style) activeCard.style.transition = "none";
      } else if (Math.abs(dy) > 16) {
        dragStart = null;
        activeCard = null;
        return;
      }
    }

    if (isDragging && activeCard.style) {
      let appliedDx = dx;
      if (currentStep === 0 && dx > 0) appliedDx = dx * 0.35;
      if (currentStep === storyBlocks.length - 1 && dx < 0) appliedDx = dx * 0.35;
      activeCard.style.transform = `translateX(${appliedDx}px) rotate(${appliedDx * 0.015}deg)`;
      activeCard.style.opacity = String(Math.max(0.45, 1 - Math.abs(appliedDx) / 360));
    }
  }, { passive: true });

  document.addEventListener("pointerup", (event) => {
    if (!dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    const card = activeCard;

    dragStart = null;
    isDragging = false;
    activeCard = null;

    if (card && card.style) {
      card.style.transition = "";
      card.style.transform = "";
      card.style.opacity = "";
    }

    if (window.getSelection && window.getSelection().toString().trim()) return;

    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.1) {
      if (dx < 0) {
        // Dragged / swiped left -> advance step
        if (currentStep < storyBlocks.length - 1) {
          event.stopImmediatePropagation();
          setStep(currentStep + 1, { focus: true, direction: "forward" });
        }
      } else if (dx > 0) {
        // Dragged / swiped right -> previous step
        if (currentStep > 0) {
          event.stopImmediatePropagation();
          setStep(currentStep - 1, { focus: true, direction: "backward" });
        }
      }
    }
  }, { capture: true });

  const ctaBtn = root.querySelector(".bio-hero__cta");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => {
      root.dataset.stage = "content";
      setStep(0, { focus: true });
    });
  }

  // Hero click to enter content
  const heroCopy = root.querySelector(".bio-hero__copy");
  if (heroCopy) {
    heroCopy.addEventListener("click", (event) => {
      if (root.dataset.stage !== "content" && !event.target.closest("a, button")) {
        root.dataset.stage = "content";
        setStep(0, { focus: true });
      }
    });
  }

  window.addEventListener("hashchange", () => {
    const target = parseHashStep();
    if (target !== currentStep) setStep(target, { updateUrl: false });
  });

  // Initialize stage & step
  const initialHash = window.location.hash;
  const hasStepHash = /^#step-\d+$/.test(initialHash);
  const initialStep = parseHashStep();
  root.dataset.stage = hasStepHash || initialStep > 0 ? "content" : "hero";
  setStep(initialStep, { updateUrl: false, stage: root.dataset.stage });
})();
