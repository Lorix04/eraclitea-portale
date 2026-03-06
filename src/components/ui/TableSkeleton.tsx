import { Skeleton } from "@/components/ui/Skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const CELL_WIDTHS = ["w-20", "w-24", "w-28", "w-32", "w-36"];

function getWidth(index: number) {
  return CELL_WIDTHS[index % CELL_WIDTHS.length];
}

export default function TableSkeleton({
  rows = 5,
  columns = 6,
}: TableSkeletonProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b bg-muted/30 px-4 py-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              className={`h-4 bg-gray-300 ${getWidth(index)}`}
            />
          ))}
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${columnIndex}`}
                className={`h-4 ${getWidth(rowIndex + columnIndex)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
