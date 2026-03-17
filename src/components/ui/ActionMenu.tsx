"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useActionShortcuts } from "@/hooks/useActionShortcuts";
import InlineConfirm from "./InlineConfirm";

type ActionVariant = "default" | "info" | "success" | "warning" | "danger";

export interface ActionItem {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  variant?: ActionVariant;
  href?: string;
  onClick?: () => void;
  requireConfirm?: boolean;
  confirmMessage?: string;
  shortcutKey?: string;
  shortcutLabel?: string;
  disabled?: boolean;
  hidden?: boolean;
}

interface ActionMenuProps {
  primaryAction: ActionItem;
  secondaryActions?: ActionItem[];
  size?: "sm" | "md";
}

const VARIANT_PRIMARY: Record<ActionVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60",
  danger:
    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60",
  default:
    "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
};

const VARIANT_MENU_ITEM: Record<ActionVariant, string> = {
  info: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30",
  success:
    "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30",
  warning:
    "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30",
  danger:
    "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
  default:
    "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
};

export default function ActionMenu({
  primaryAction,
  secondaryActions = [],
  size = "sm",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionItem | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, flipUp: false });

  const visibleSecondary = secondaryActions.filter((a) => !a.hidden);

  // Position the dropdown
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 250; // estimated max
    const flipUp = rect.bottom + menuHeight > window.innerHeight;
    setDropdownPos({
      top: flipUp ? rect.top : rect.bottom + 4,
      left: Math.max(8, rect.right - 220),
      flipUp,
    });
  }, []);

  const openDropdown = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, []);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, closeDropdown]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeDropdown();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, closeDropdown]);

  // Scroll/resize closes dropdown
  useEffect(() => {
    if (!open) return;
    const handler = () => closeDropdown();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, closeDropdown]);

  // Handle action trigger (from dropdown click or shortcut)
  const handleAction = useCallback(
    (action: ActionItem) => {
      closeDropdown();
      if (action.requireConfirm) {
        setConfirmAction(action);
      } else if (action.onClick) {
        action.onClick();
      }
      // href actions are handled by Link, no need for onClick
    },
    [closeDropdown],
  );

  // Keyboard shortcuts when dropdown open
  useActionShortcuts(
    visibleSecondary,
    open,
    useCallback(
      (key: string) => {
        const action = visibleSecondary.find((a) => a.key === key);
        if (action && !action.disabled) {
          if (action.href) {
            closeDropdown();
            // Navigate programmatically
            window.location.href = action.href;
          } else {
            handleAction(action);
          }
        }
      },
      [visibleSecondary, handleAction, closeDropdown],
    ),
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmAction?.onClick) return;
    setConfirmLoading(true);
    try {
      await confirmAction.onClick();
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
    }
  }, [confirmAction]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const sizeClasses =
    size === "sm"
      ? "px-2 py-1 text-xs gap-1"
      : "px-3 py-1.5 text-sm gap-1.5";

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  // Render primary action
  const primaryVariant = primaryAction.variant ?? "info";
  const PrimaryIcon = primaryAction.icon;
  const primaryClasses = `inline-flex items-center ${sizeClasses} rounded-lg border font-medium transition-colors ${VARIANT_PRIMARY[primaryVariant]} disabled:opacity-50`;

  const primaryContent = (
    <>
      {PrimaryIcon ? <PrimaryIcon className={iconSize} /> : null}
      <span>{primaryAction.label}</span>
    </>
  );

  // If confirming, show confirm bar instead of actions
  if (confirmAction) {
    return (
      <InlineConfirm
        message={confirmAction.confirmMessage ?? `${confirmAction.label}?`}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
        isLoading={confirmLoading}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {primaryAction.href ? (
        <Link href={primaryAction.href} className={primaryClasses}>
          {primaryContent}
        </Link>
      ) : (
        <button
          type="button"
          className={primaryClasses}
          onClick={() =>
            primaryAction.requireConfirm
              ? setConfirmAction(primaryAction)
              : primaryAction.onClick?.()
          }
          disabled={primaryAction.disabled}
        >
          {primaryContent}
        </button>
      )}

      {visibleSecondary.length > 0 ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={`rounded-lg border border-gray-200 p-1.5 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 ${
              open ? "bg-gray-100 dark:bg-gray-800" : ""
            }`}
            onClick={() => (open ? closeDropdown() : openDropdown())}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <MoreHorizontal className={iconSize} />
          </button>

          {open
            ? createPortal(
                <div
                  ref={dropdownRef}
                  role="menu"
                  className="fixed z-50 w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150 dark:border-gray-700 dark:bg-gray-900"
                  style={{
                    top: dropdownPos.flipUp ? undefined : dropdownPos.top,
                    bottom: dropdownPos.flipUp
                      ? window.innerHeight - dropdownPos.top + 4
                      : undefined,
                    left: dropdownPos.left,
                  }}
                >
                  {visibleSecondary.map((action, idx) => {
                    const variant = action.variant ?? "default";
                    const Icon = action.icon;

                    // Separator before first danger item
                    const prevVariant =
                      idx > 0
                        ? visibleSecondary[idx - 1]?.variant ?? "default"
                        : null;
                    const showSeparator =
                      variant === "danger" && prevVariant !== "danger";

                    return (
                      <div key={action.key}>
                        {showSeparator ? (
                          <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                        ) : null}
                        {action.href ? (
                          <Link
                            href={action.href}
                            role="menuitem"
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${VARIANT_MENU_ITEM[variant]} ${
                              action.disabled ? "pointer-events-none opacity-40" : ""
                            }`}
                            onClick={() => closeDropdown()}
                          >
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                            <span className="flex-1">{action.label}</span>
                            {action.shortcutLabel ?? action.shortcutKey ? (
                              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-800">
                                {action.shortcutLabel ?? action.shortcutKey}
                              </kbd>
                            ) : null}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            role="menuitem"
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${VARIANT_MENU_ITEM[variant]} ${
                              action.disabled ? "pointer-events-none opacity-40" : ""
                            }`}
                            onClick={() => handleAction(action)}
                            disabled={action.disabled}
                          >
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                            <span className="flex-1 text-left">
                              {action.label}
                            </span>
                            {action.shortcutLabel ?? action.shortcutKey ? (
                              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-800">
                                {action.shortcutLabel ?? action.shortcutKey}
                              </kbd>
                            ) : null}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>,
                document.body,
              )
            : null}
        </>
      ) : null}
    </div>
  );
}
