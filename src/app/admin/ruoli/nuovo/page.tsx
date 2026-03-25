"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import RoleModal from "@/components/admin/RoleModal";

export default function NewRolePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <RoleModal
      open={true}
      onClose={() => router.push("/admin/ruoli")}
      onSaved={() => {
        queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
        router.push("/admin/ruoli");
      }}
    />
  );
}
