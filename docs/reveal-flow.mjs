const revealSteps = [
  { phase: 1, action: "message", ripple: false },
  { phase: 2, action: "focus-partial", ripple: false },
  { phase: 3, action: "still", ripple: true },
  { phase: 4, action: "focus-full", ripple: false },
  { phase: 5, action: "final", ripple: true }
];

const standardTimings = Object.freeze({
  focusDuration: 2250,
  messageDuration: 10000,
  discoveryDelay: 7800,
  biographyDelay: 700,
});

const reducedMotionTimings = Object.freeze({
  focusDuration: 40,
  messageDuration: 40,
  discoveryDelay: 3200,
  biographyDelay: 40,
});

export function getNextRevealStep(currentPhase) {
  return revealSteps[Number(currentPhase)] || { phase: 5, action: "done", ripple: false };
}

export function getRevealTimings({ reducedMotion = false } = {}) {
  return reducedMotion ? reducedMotionTimings : standardTimings;
}
