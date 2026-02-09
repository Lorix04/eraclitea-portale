interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className || ""}`} />;
}
