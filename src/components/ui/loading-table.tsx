import { Skeleton } from "@/components/ui/Skeleton";

type LoadingTableProps = {
  rows?: number;
  cols?: number;
};

export function LoadingTable({ rows = 5, cols = 4 }: LoadingTableProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
