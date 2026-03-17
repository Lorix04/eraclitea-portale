"use client";

import { useEffect } from "react";

interface ShortcutAction {
  shortcutKey?: string;
  key: string;
  disabled?: boolean;
  hidden?: boolean;
}

export function useActionShortcuts(
  actions: ShortcutAction[],
  isActive: boolean,
  onTrigger: (key: string) => void,
) {
  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const pressed = e.key.toLowerCase();

      for (const action of actions) {
        if (!action.shortcutKey || action.disabled || action.hidden) continue;
        const shortcut = action.shortcutKey.toLowerCase();

        const match =
          shortcut === pressed ||
          (shortcut === "delete" &&
            (pressed === "delete" || pressed === "backspace"));

        if (match) {
          e.preventDefault();
          onTrigger(action.key);
          return;
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [actions, isActive, onTrigger]);
}
