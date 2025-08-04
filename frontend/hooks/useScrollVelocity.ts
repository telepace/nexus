import { useRef, useCallback, useState } from "react";

export interface ScrollVelocityData {
  velocity: number; // pixels per second
  direction: "up" | "down" | "idle";
  isScrolling: boolean;
  timestamp: number;
}

export interface UseScrollVelocityOptions {
  threshold?: number; // minimum velocity to consider as "fast scrolling"
  sampleWindow?: number; // ms window for velocity calculation
  debounceDelay?: number; // ms delay before marking as idle
}

/**
 * Hook to track scroll velocity and direction for intelligent preloading
 *
 * @param options Configuration options
 * @returns Scroll velocity data and a scroll handler function
 */
export function useScrollVelocity(options: UseScrollVelocityOptions = {}) {
  const {
    threshold = 100, // pixels per second
    sampleWindow = 100, // 100ms window
    debounceDelay = 150, // 150ms idle detection
  } = options;

  const [velocityData, setVelocityData] = useState<ScrollVelocityData>({
    velocity: 0,
    direction: "idle",
    isScrolling: false,
    timestamp: Date.now(),
  });

  const lastScrollRef = useRef({ top: 0, time: Date.now() });
  const scrollHistoryRef = useRef<Array<{ position: number; time: number }>>(
    [],
  );
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateVelocity = useCallback(() => {
    const history = scrollHistoryRef.current;
    if (history.length < 2) return 0;

    // Use samples within the time window
    const now = Date.now();
    const validSamples = history.filter(
      (sample) => now - sample.time <= sampleWindow,
    );

    if (validSamples.length < 2) return 0;

    const firstSample = validSamples[0];
    const lastSample = validSamples[validSamples.length - 1];

    const deltaPosition = lastSample.position - firstSample.position;
    const deltaTime = lastSample.time - firstSample.time;

    if (deltaTime === 0) return 0;

    return Math.abs((deltaPosition / deltaTime) * 1000); // pixels per second
  }, [sampleWindow]);

  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const scrollTop = target.scrollTop;
      const now = Date.now();

      // Add to history
      scrollHistoryRef.current.push({ position: scrollTop, time: now });

      // Keep only recent samples
      scrollHistoryRef.current = scrollHistoryRef.current.filter(
        (sample) => now - sample.time <= sampleWindow * 2,
      );

      // Calculate velocity and direction
      const velocity = calculateVelocity();
      const lastPosition = lastScrollRef.current.top;

      let direction: "up" | "down" | "idle" = "idle";
      if (scrollTop > lastPosition) {
        direction = "down";
      } else if (scrollTop < lastPosition) {
        direction = "up";
      }

      // Update state
      setVelocityData({
        velocity,
        direction,
        isScrolling: true,
        timestamp: now,
      });

      // Update refs
      lastScrollRef.current = { top: scrollTop, time: now };

      // Clear existing timeout
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      // Set idle timeout
      idleTimeoutRef.current = setTimeout(() => {
        setVelocityData((prev) => ({
          ...prev,
          velocity: 0,
          direction: "idle",
          isScrolling: false,
          timestamp: Date.now(),
        }));
      }, debounceDelay);
    },
    [calculateVelocity, sampleWindow, debounceDelay],
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
  }, []);

  return {
    velocityData,
    handleScroll,
    cleanup,
    // Helper functions
    isFastScrolling: velocityData.velocity > threshold,
    isScrollingDown: velocityData.direction === "down",
    isScrollingUp: velocityData.direction === "up",
  };
}
