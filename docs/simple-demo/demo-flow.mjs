const INITIAL_STATE = Object.freeze({
  phase: "approach",
  countdown: 0,
  storyLayer: 0,
});

function snapshot(state) {
  return {
    phase: state.phase,
    countdown: state.countdown,
    storyLayer: state.storyLayer,
  };
}

function transition(state, event) {
  if (state.phase === "approach" && event === "DETECTED") {
    return { phase: "nfc", countdown: 0, storyLayer: 0 };
  }

  if (state.phase === "nfc" && event === "OPEN") {
    return { phase: "entry", countdown: 0, storyLayer: 0 };
  }

  if (state.phase === "entry" && event === "BEGIN_STORY") {
    return { phase: "countdown", countdown: 1, storyLayer: 0 };
  }

  if (state.phase === "countdown" && event === "TICK") {
    if (state.countdown < 3) return { ...state, countdown: state.countdown + 1 };
    return { phase: "story", countdown: 0, storyLayer: 1 };
  }

  if (state.phase === "story" && event === "REVEAL_LAYER") {
    return { ...state, storyLayer: Math.min(3, state.storyLayer + 1) };
  }

  return state;
}

export function createDemoFlow() {
  let state = { ...INITIAL_STATE };

  return {
    snapshot() {
      return snapshot(state);
    },
    dispatch(event) {
      state = transition(state, event);
      return snapshot(state);
    },
  };
}

export function isStoryLayerVisible(state, index) {
  return state?.phase === "story" && state.storyLayer === index;
}
