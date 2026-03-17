"use client";

import { useRef, useState, useCallback, type CSSProperties, type RefObject } from "react";
import { useMediaQuery } from "./useMediaQuery";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

interface SwipeResult {
  ref: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  leftRevealed: boolean;
  rightRevealed: boolean;
  reset: () => void;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

export function useSwipeActions(options: SwipeOptions): SwipeResult {
  const { onSwipeLeft, onSwipeRight, threshold = 80, enabled = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);

  const active = enabled && isMobile;

  const reset = useCallback(() => {
    setOffsetX(0);
    swiping.current = false;
    directionLocked.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!active) return;
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      swiping.current = true;
      directionLocked.current = null;
    },
    [active],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!active || !swiping.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      if (!directionLocked.current) {
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          directionLocked.current =
            Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        }
        return;
      }

      if (directionLocked.current === "vertical") return;

      // Only allow swipe in directions that have handlers
      if (dx < 0 && !onSwipeLeft) return;
      if (dx > 0 && !onSwipeRight) return;

      // Dampen the movement beyond threshold
      const clamped = Math.abs(dx) > threshold * 1.5
        ? Math.sign(dx) * (threshold * 1.5)
        : dx;

      setOffsetX(clamped);
    },
    [active, onSwipeLeft, onSwipeRight, threshold],
  );

  const onTouchEnd = useCallback(() => {
    if (!active || !swiping.current) return;

    if (Math.abs(offsetX) >= threshold) {
      if (offsetX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (offsetX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    reset();
  }, [active, offsetX, threshold, onSwipeLeft, onSwipeRight, reset]);

  const style: CSSProperties = active && offsetX !== 0
    ? { transform: `translateX(${offsetX}px)`, transition: swiping.current ? "none" : "transform 0.3s ease-out" }
    : { transition: "transform 0.3s ease-out" };

  return {
    ref,
    style,
    leftRevealed: offsetX < -threshold * 0.5,
    rightRevealed: offsetX > threshold * 0.5,
    reset,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
