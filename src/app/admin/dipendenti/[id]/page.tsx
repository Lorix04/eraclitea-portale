"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import EmployeeForm, { type EmployeeFormData } from "@/components/EmployeeForm";
import EmployeeCoursesList from "@/components/EmployeeCoursesList";
import EmployeeCertificatesList from "@/components/EmployeeCertificatesList";
import { useEmployee } from "@/hooks/useEmployee";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import EmployeeCustomFields from "@/components/EmployeeCustomFields";
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
  const [showForceDialog, setShowForceDialog] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<EmployeeFormData | null>(null);
  const [forceDetails, setForceDetails] = useState<{
    mismatches: string[];
    warnings: string[];
    duplicate?: {
      fullName: string;
      fiscalCode: string;
    } | null;
  }>({
    mismatches: [],
    warnings: [],
    duplicate: null,
  });

  const employee = data?.data;

  const handleSubmit = async (
    payload: EmployeeFormData,
    options?: { force?: boolean }
  ) => {
    if (!employeeId) return;
    setSaving(true);
    const updatePayload = {
      nome: payload.nome,
      cognome: payload.cognome,
      codiceFiscale: payload.codiceFiscale,
      sesso: payload.sesso,
      email: payload.email,
      telefono: payload.telefono,
      cellulare: payload.cellulare,
      indirizzo: payload.indirizzo,
      comuneResidenza: payload.comuneResidenza,
      cap: payload.cap,
      provincia: payload.provincia,
      regione: payload.regione,
      emailAziendale: payload.emailAziendale,
      pec: payload.pec,
      partitaIva: payload.partitaIva,
      iban: payload.iban,
      mansione: payload.mansione,
      luogoNascita: payload.luogoNascita,
      note: payload.note,
      dataNascita: payload.dataNascita,
      force: Boolean(options?.force),
    };
    const res = await fetch(`/api/dipendenti/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.status === 409 && json?.canForce && !options?.force) {
      setPendingPayload(payload);
      setForceDetails({
        mismatches: Array.isArray(json.mismatches) ? json.mismatches : [],
        warnings: Array.isArray(json.warnings) ? json.warnings : [],
        duplicate: json.duplicateEmployee
          ? {
              fullName: json.duplicateEmployee.fullName,
              fiscalCode: json.duplicateEmployee.fiscalCode,
            }
          : null,
      });
      setShowForceDialog(true);
      return;
    }
    if (!res.ok) {
      toast.error(json?.error || "Errore durante il salvataggio");
      return;
    }
    if (Array.isArray(json?.warnings) && json.warnings.length > 0) {
      toast.warning("Dipendente aggiornato con avvisi");
    } else {
      toast.success("Dipendente aggiornato");
    }
    setShowForceDialog(false);
    setPendingPayload(null);
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
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <Link href="/admin/dipendenti" className="text-xs text-primary md:text-sm">
            &larr; Torna ai dipendenti
          </Link>
          <h1 className="mt-1 break-words text-lg font-semibold md:mt-2 md:text-xl">
            {employee.cognome} {employee.nome}
          </h1>
          <p className="break-all text-xs text-muted-foreground md:text-sm">
            CF: {employee.codiceFiscale} - Cliente:{" "}
            {employee.client?.ragioneSociale ?? "-"}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground md:px-4 md:py-2 md:text-sm"
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
          <EmployeeForm
            employeeId={employee.id}
            role="ADMIN"
            clientId={employee.clientId}
            employee={employee}
            onSubmit={(payload) => handleSubmit(payload)}
            isLoading={saving}
          />
        </div>
      </div>

      <EmployeeCustomFields
        clientId={employee.clientId}
        customData={employee.customData}
      />

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

      {showForceDialog ? (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              if (!saving) setShowForceDialog(false);
            }}
            aria-hidden="true"
          />
          <div className="fixed inset-0 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
            <div
              className="modal-panel bg-card shadow-xl sm:max-w-lg"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
                <h2 className="text-lg font-semibold">
                  Attenzione: incongruenze rilevate
                </h2>
              </div>

              <div className="modal-body modal-scroll space-y-3 text-sm">
                <p>Il codice fiscale presenta i seguenti problemi:</p>
                {forceDetails.mismatches.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {forceDetails.mismatches.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Nessuna incongruenza anagrafica.</p>
                )}

                {forceDetails.duplicate ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                    <p className="font-semibold">Codice fiscale duplicato</p>
                    <p>
                      Il codice fiscale {forceDetails.duplicate.fiscalCode} è già assegnato al
                      dipendente {forceDetails.duplicate.fullName}.
                    </p>
                  </div>
                ) : null}

                {forceDetails.warnings.length > 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-700">
                    <p className="font-semibold">Avvisi</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {forceDetails.warnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p>Vuoi procedere comunque con la modifica?</p>
              </div>

              <div className="modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-md border px-4 py-2 text-sm"
                  onClick={() => setShowForceDialog(false)}
                  disabled={saving}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground"
                  disabled={saving || !pendingPayload}
                  onClick={async () => {
                    if (!pendingPayload) return;
                    await handleSubmit(pendingPayload, { force: true });
                  }}
                >
                  Conferma comunque
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



