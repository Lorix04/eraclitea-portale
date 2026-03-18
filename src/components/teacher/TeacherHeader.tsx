"use client";

import { type ReactNode } from "react";

type TeacherHeaderProps = {
  leftSlot?: ReactNode;
  children?: ReactNode;
};

export default function TeacherHeader({ leftSlot, children }: TeacherHeaderProps) {
  return (
    <header className="app-header relative z-40 flex items-center justify-between gap-3 px-4 py-3 md:flex-wrap md:gap-4 md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        {leftSlot}
        <div>
          <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground md:block">
            Portale
          </p>
          <h2 className="text-base font-display font-semibold md:text-lg">Docente</h2>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {children}
      </div>
    </header>
  );
}
