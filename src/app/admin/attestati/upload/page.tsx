import { Suspense } from "react";
import AdminUploadAttestatiPageClient from "./UploadPageClient";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminUploadAttestatiPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      }
    >
      <AdminUploadAttestatiPageClient />
    </Suspense>
  );
}
