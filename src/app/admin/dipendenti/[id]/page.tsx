"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import EmployeeForm, { type EmployeeFormData } from "@/components/EmployeeForm";
import EmployeeCoursesList from "@/components/EmployeeCoursesList";
import EmployeeCertificatesList from "@/components/EmployeeCertificatesList";
import { useEmployee } from "@/hooks/useEmployee";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminEmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId =
    typeof params?.id === "string" ? params.id : params?.id?.[0];
  const { data, isLoading, refetch } = useEmployee(employeeId);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const employee = data?.data;

  const handleSubmit = async (payload: EmployeeFormData) => {
    if (!employeeId) return;
    setSaving(true);
    const updatePayload = {
      nome: payload.nome,
      cognome: payload.cognome,
      email: payload.email,
      mansione: payload.mansione,
      luogoNascita: payload.luogoNascita,
      note: payload.note,
      dataNascita: payload.dataNascita,
    };
    const res = await fetch(`/api/dipendenti/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Errore durante il salvataggio");
      return;
    }
    toast.success("Dipendente aggiornato");
    refetch();
  };

  const handleDeleteEmployee = async () => {
    if (!employeeId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/dipendenti/${employeeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Dipendente eliminato con successo");
        router.push("/admin/dipendenti");
      } else {
        const dataRes = await res.json().catch(() => ({}));
        toast.error(dataRes?.error ?? "Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore eliminazione dipendente:", error);
      toast.error("Errore durante l'eliminazione del dipendente");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-6 h-32 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Dipendente non trovato.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/dipendenti" className="text-sm text-primary">
            &larr; Torna ai dipendenti
          </Link>
          <h1 className="mt-2 text-xl font-semibold">
            {employee.cognome} {employee.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            CF: {employee.codiceFiscale} - Cliente:{" "}
            {employee.client?.ragioneSociale ?? "-"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground"
          onClick={() => setDeleteModalOpen(true)}
        >
          Elimina
        </button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Dati anagrafici</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aggiorna le informazioni del dipendente.
        </p>
        <div className="mt-6">
          <EmployeeForm employee={employee} onSubmit={handleSubmit} isLoading={saving} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Corsi</h2>
        <EmployeeCoursesList
          registrations={employee.registrations ?? []}
          getEditionHref={(reg) =>
            `/admin/corsi/${reg.courseEdition.course.id}/edizioni/${reg.courseEdition.id}`
          }
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Attestati</h2>
        <EmployeeCertificatesList certificates={employee.certificates ?? []} />
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDeleteEmployee}
        title="Elimina dipendente"
        description="Sei sicuro di voler eliminare questo dipendente?"
        itemName={`${employee.nome} ${employee.cognome}`}
        isDeleting={isDeleting}
        warningMessage={
          employee.registrations?.length || employee.certificates?.length
            ? `Questo dipendente ha ${employee.registrations?.length ?? 0} iscrizioni a corsi e ${employee.certificates?.length ?? 0} attestati. Tutti i dati associati verranno eliminati permanentemente.`
            : "Questa azione non puo' essere annullata."
        }
      />
    </div>
  );
}



