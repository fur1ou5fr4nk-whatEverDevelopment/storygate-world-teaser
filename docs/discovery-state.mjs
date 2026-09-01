export function createDiscoveryTracker(requiredIds) {
  const required = new Set(requiredIds);
  const found = new Set();

  return {
    find(id) {
      const newlyFound = required.has(id) && !found.has(id);
      if (newlyFound) found.add(id);

      return {
        newlyFound,
        foundCount: found.size,
        allFound: found.size === required.size
      };
    }
  };
}
