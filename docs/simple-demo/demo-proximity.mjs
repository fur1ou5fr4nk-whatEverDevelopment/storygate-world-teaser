function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function distanceBetween(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function createProximityTracker({
  mode,
  start,
  target,
  travel = 180,
  threshold = 0.82,
}) {
  const initialDistance = mode === "desktop"
    ? Math.max(1, distanceBetween(start, target))
    : Math.max(1, travel);
  let detected = false;

  return {
    update(point) {
      if (detected) return { phase: "detected", progress: 1 };

      const progress = mode === "desktop"
        ? clamp(1 - distanceBetween(point, target) / initialDistance)
        : clamp((start.y - point.y) / initialDistance);

      if (progress >= threshold) detected = true;

      return {
        phase: detected ? "detected" : "approach",
        progress,
      };
    },
  };
}
