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
    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{value}</span>
          {total !== undefined ? (
            <span className="text-sm text-muted-foreground">/ {total}</span>
          ) : null}
        </div>
      </div>
      <div className="text-muted-foreground">{icon}</div>
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
