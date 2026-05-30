import { useEffect, useState } from "react";
import { formatCallDuration } from "@/hooks/useCallDuration";

/** Elapsed time since the host went live. */
export function useLiveStreamDuration(active: boolean): string {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    setSeconds(0);
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return formatCallDuration(seconds);
}
