import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
