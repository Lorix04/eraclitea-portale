"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type MobileSidebarProps = {
  role?: "CLIENT" | "ADMIN";
};

export default function MobileSidebar({ role = "CLIENT" }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => setOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

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
          className="fixed inset-0 bg-black/40"
          onClick={() => setOpen(false)}
        />

        <aside
          className="fixed left-0 top-0 flex h-full w-[82vw] max-w-[320px] flex-col bg-card shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-muted"
              aria-label="Chiudi menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Sidebar
              role={role}
              onNavigate={() => setOpen(false)}
              className="h-auto w-full border-r-0 shadow-none"
            />
          </div>
        </aside>
      </dialog>
    </>
  );
}
