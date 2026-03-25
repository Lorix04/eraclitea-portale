"use client";

import { useCallback, useEffect, useState } from "react";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import AddReferentModal from "@/components/admin/AddReferentModal";

type Referent = {
  id: string;
  userId: string;
  userEmail: string;
  roleName: string | null;
  assignedAt: string;
  notes: string | null;
};

type EditionReferentsSectionProps = {
  courseId: string;
  editionId: string;
  canEdit: boolean;
};

export default function EditionReferentsSection({
  courseId,
  editionId,
  canEdit,
}: EditionReferentsSectionProps) {
  const [referents, setReferents] = useState<Referent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchReferents = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/referents`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setReferents(json.referents ?? []);
    } catch {
      setReferents([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, editionId]);

  useEffect(() => {
    fetchReferents();
  }, [fetchReferents]);

  const handleRemove = async (referentId: string) => {
    try {
      const res = await fetch(
        `/api/corsi/${courseId}/edizioni/${editionId}/referents/${referentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Errore");
      }
      toast.success("Referente rimosso");
      setReferents((prev) => prev.filter((r) => r.id !== referentId));
    } catch (err: any) {
      toast.error(err.message || "Errore");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          Referenti edizione
        </h3>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            <UserPlus className="h-3 w-3" /> Aggiungi
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border bg-muted" />
          ))}
        </div>
      ) : referents.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nessun referente assegnato. L&apos;edizione è visibile a tutti gli amministratori.
          {canEdit ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-2 block mx-auto text-xs text-primary underline"
            >
              + Aggiungi referente
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {referents.map((ref) => (
            <div
              key={ref.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ref.userEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {ref.roleName ?? "Nessun ruolo"}
                  {" · "}
                  {new Date(ref.assignedAt).toLocaleDateString("it-IT")}
                  {ref.notes ? ` · ${ref.notes}` : ""}
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => handleRemove(ref.id)}
                  className="flex-shrink-0 rounded-md p-1 text-red-500 hover:bg-red-50"
                  title="Rimuovi referente"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <AddReferentModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          courseId={courseId}
          editionId={editionId}
          existingUserIds={referents.map((r) => r.userId)}
          onAdded={() => {
            setShowAdd(false);
            fetchReferents();
          }}
        />
      ) : null}
    </div>
  );
}
