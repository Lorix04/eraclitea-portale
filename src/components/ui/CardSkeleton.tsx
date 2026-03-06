import { Skeleton } from "@/components/ui/Skeleton";

interface CardSkeletonProps {
  className?: string;
}

export default function CardSkeleton({ className = "" }: CardSkeletonProps) {
  return (
    <div className={`rounded-lg border bg-card p-6 ${className}`.trim()}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-4 h-7 w-32" />
      <Skeleton className="mt-3 h-4 w-24" />
    </div>
  );
}
