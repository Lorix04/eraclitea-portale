"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function SwipeHint() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [dismissed, setDismissed] = useLocalStorage("swipe-actions-hint-dismissed", false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobile || dismissed) return;
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [isMobile, dismissed]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      setDismissed(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [visible, setDismissed]);

  if (!visible) return null;

  return (
    <div
      className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-gray-100 py-2 text-xs text-gray-400 transition-opacity duration-500 dark:bg-gray-800"
      onClick={() => {
        setVisible(false);
        setDismissed(true);
      }}
    >
      <span className="animate-pulse">&larr;</span>
      <span>Scorri per le azioni</span>
      <span className="animate-pulse">&rarr;</span>
    </div>
  );
}
