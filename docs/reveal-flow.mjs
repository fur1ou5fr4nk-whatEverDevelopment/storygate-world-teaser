const revealSteps = [
  { phase: 1, action: "focus" },
  { phase: 2, action: "message" },
  { phase: 3, action: "still" },
  { phase: 4, action: "final" }
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
  return revealSteps[Number(currentPhase)] || { phase: 4, action: "done" };
}

export function getRevealTimings({ reducedMotion = false } = {}) {
  return reducedMotion ? reducedMotionTimings : standardTimings;
}
