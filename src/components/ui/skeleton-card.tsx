export function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 animate-pulse">
      <div className="h-6 w-3/4 rounded-md bg-muted" />
      <div className="h-4 w-1/2 rounded-md bg-muted" />
      <div className="h-20 w-full rounded-md bg-muted" />
    </div>
  );
}
