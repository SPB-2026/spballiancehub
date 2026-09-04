import { useEffect, useState } from 'react';

// Re-renders on an interval so countdowns stay live without polling the API.
export function useCountdownTick(active = true, ms = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [active, ms]);
}
