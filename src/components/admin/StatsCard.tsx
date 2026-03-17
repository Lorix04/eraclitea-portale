import Link from "next/link";
import type { ReactNode } from "react";

export default function StatsCard({
  title,
  value,
  total,
  icon,
  href,
}: {
  title: string;
  value: number;
  total?: number;
  icon: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3 md:p-4">
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground md:text-sm">{title}</p>
        <div className="mt-1 flex items-baseline gap-1 md:mt-2 md:gap-2">
          <span className="text-xl font-semibold md:text-2xl">{value}</span>
          {total !== undefined ? (
            <span className="text-xs text-muted-foreground md:text-sm">/ {total}</span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-muted-foreground">{icon}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
