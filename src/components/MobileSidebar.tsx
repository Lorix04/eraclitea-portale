"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import ClientSidebar from "@/components/ClientSidebar";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";

type MobileSidebarProps = {
  role?: "CLIENT" | "ADMIN" | "TEACHER";
};

export default function MobileSidebar({ role = "CLIENT" }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closingRef = useRef(false);
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(() => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      setOpen(false);
      closingRef.current = false;
    }, 300);
  }, []);

  // Open: showModal then trigger animation
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    }
  }, [open]);

  // Sync native dialog close (e.g. Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onDialogClose = () => {
      setVisible(false);
      setOpen(false);
      closingRef.current = false;
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, []);

  // Auto-close on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname && open) {
      handleClose();
    }
    prevPathRef.current = pathname;
  }, [pathname, open, handleClose]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Apri menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 h-full w-full max-w-none bg-transparent p-0"
        aria-label="Menu mobile"
      >
        <div
          className={cn(
            "fixed inset-0 transition-opacity duration-300",
            visible ? "bg-black/40" : "bg-black/0"
          )}
          onClick={handleClose}
        />

        <aside
          className={cn(
            "fixed left-0 top-0 flex h-full w-[82vw] max-w-[320px] flex-col bg-card shadow-2xl transition-transform duration-300 ease-out",
            visible ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-end border-b px-4 py-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1 hover:bg-muted"
              aria-label="Chiudi menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {role === "ADMIN" ? (
              <Sidebar
                role="ADMIN"
                onNavigate={handleClose}
                className="h-auto w-full border-r-0 shadow-none"
              />
            ) : role === "TEACHER" ? (
              <TeacherSidebar
                onNavigate={handleClose}
                className="h-auto w-full border-r-0 shadow-none"
              />
            ) : (
              <ClientSidebar
                onNavigate={handleClose}
                className="h-auto w-full border-r-0 shadow-none"
              />
            )}
          </div>
        </aside>
      </dialog>
    </>
  );
}
