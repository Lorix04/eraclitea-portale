"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import EmployeeTable from "@/components/EmployeeTable";
import { useEmployees } from "@/hooks/useEmployees";
import { useDebounce } from "@/hooks/useDebounce";
import { BrandedButton } from "@/components/BrandedButton";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";
import { isValidCodiceFiscale, normalizeCodiceFiscale } from "@/lib/validators";
import { toast } from "sonner";

type EditionOption = {
  id: string;
  label: string;
};

type EmployeeRow = {
  id: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  createdAt?: string | Date;
  _count?: { registrations?: number; certificates?: number };
  registrations?: { courseEditionId: string }[];
};

const PAGE_SIZE = 20;

function ClientDipendentiContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialSearch = searchParams.get("search") ?? "";
  const initialEdition = searchParams.get("editionId") ?? "";
  const initialCertStatus = searchParams.get("certStatus") ?? "all";
  const initialSortOrder = searchParams.get("sortOrder") ?? "desc";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [search, setSearch] = useState(initialSearch);
  const [editionId, setEditionId] = useState(initialEdition);
  const [certStatus, setCertStatus] = useState(initialCertStatus);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    initialSortOrder === "asc" ? "asc" : "desc"
  );
  const [page, setPage] = useState(initialPage);
  const [editions, setEditions] = useState<EditionOption[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalMounted, setAddModalMounted] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    nome: "",
    cognome: "",
    codiceFiscale: "",
    email: "",
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, editionId, certStatus, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (editionId) params.set("editionId", editionId);
    if (certStatus && certStatus !== "all") params.set("certStatus", certStatus);
    if (sortOrder && sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearch, editionId, certStatus, sortOrder, page, router, pathname]);

  useEffect(() => {
    const loadEditions = async () => {
      const res = await fetch("/api/corsi/cliente?tab=tutti&all=true");
      if (!res.ok) {
        setEditions([]);
        return;
      }
      const json = await res.json();
      const data = json.data ?? [];
      const options: EditionOption[] = [];
      data.forEach((course: any) => {
        (course.editions ?? []).forEach((edition: any) => {
          const editionLabel = edition.editionNumber
            ? `Ed. #${edition.editionNumber}`
            : "Edizione";
          options.push({
            id: edition.id,
            label: `${course.title} - ${editionLabel}`,
          });
        });
      });
      setEditions(options);
    };
    loadEditions();
  }, []);

  useEffect(() => {
    setAddModalMounted(true);
  }, []);

  useEffect(() => {
    if (!addModalMounted) return;
    if (addModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [addModalOpen, addModalMounted]);

  const { data, isLoading, refetch } = useEmployees({
    page: 1,
    limit: 1000,
    includeRegistrations: true,
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{
    id: string;
    nome: string;
    cognome: string;
    registrationsCount: number;
    certificatesCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const allEmployees = useMemo<EmployeeRow[]>(() => data?.data ?? [], [data]);

  const filteredEmployees = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    let items = allEmployees;

    if (term) {
      items = items.filter((employee) => {
        const nome = employee.nome?.toLowerCase() ?? "";
        const cognome = employee.cognome?.toLowerCase() ?? "";
        const cf = employee.codiceFiscale?.toLowerCase() ?? "";
        return (
          nome.includes(term) ||
          cognome.includes(term) ||
          cf.includes(term)
        );
      });
    }

    if (editionId) {
      items = items.filter((employee) =>
        (employee.registrations ?? []).some(
          (reg) => reg.courseEditionId === editionId
        )
      );
    }

    if (certStatus === "with") {
      items = items.filter((employee) => (employee._count?.certificates ?? 0) > 0);
    }
    if (certStatus === "without") {
      items = items.filter((employee) => (employee._count?.certificates ?? 0) === 0);
    }

    const sorted = [...items].sort((a, b) => {
      const dateA = new Date(a.createdAt ?? 0).getTime();
      const dateB = new Date(b.createdAt ?? 0).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  }, [allEmployees, debouncedSearch, editionId, certStatus, sortOrder]);

  const totalCount = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/dipendenti/export?${params.toString()}`;
  }, [debouncedSearch]);

  const resetFilters = () => {
    setSearch("");
    setEditionId("");
    setCertStatus("all");
    setSortOrder("desc");
    setPage(1);
  };

  const handleDeleteClick = (employee: {
    id: string;
    nome: string;
    cognome: string;
    _count?: { registrations?: number; certificates?: number };
  }) => {
    setEmployeeToDelete({
      id: employee.id,
      nome: employee.nome,
      cognome: employee.cognome,
      registrationsCount: employee._count?.registrations ?? 0,
      certificatesCount: employee._count?.certificates ?? 0,
    });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/dipendenti/${employeeToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Dipendente eliminato con successo");
        setDeleteModalOpen(false);
        setEmployeeToDelete(null);
        refetch();
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

  const updateAddField = (key: keyof typeof addForm, value: string) => {
    setAddForm((prev) => ({ ...prev, [key]: value }));
    if (addErrors[key]) {
      setAddErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const resetAddForm = () => {
    setAddForm({
      nome: "",
      cognome: "",
      codiceFiscale: "",
      email: "",
    });
    setAddErrors({});
  };

  const handleAddEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!addForm.nome.trim()) fieldErrors.nome = "Questo campo e obbligatorio";
    if (!addForm.cognome.trim()) {
      fieldErrors.cognome = "Questo campo e obbligatorio";
    }
    if (!addForm.codiceFiscale.trim()) {
      fieldErrors.codiceFiscale = "Questo campo e obbligatorio";
    } else if (!isValidCodiceFiscale(addForm.codiceFiscale)) {
      fieldErrors.codiceFiscale = "Codice fiscale non valido";
    }

    const normalizedCF = normalizeCodiceFiscale(addForm.codiceFiscale);
    if (
      !fieldErrors.codiceFiscale &&
      allEmployees.some(
        (employee) =>
          normalizeCodiceFiscale(employee.codiceFiscale) === normalizedCF
      )
    ) {
      fieldErrors.codiceFiscale = "Dipendente con questo codice fiscale gia presente";
    }

    setAddErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setAddSaving(true);
    try {
      const res = await fetch("/api/dipendenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: addForm.nome.trim(),
          cognome: addForm.cognome.trim(),
          codiceFiscale: normalizedCF,
          email: addForm.email.trim() || "",
        }),
      });

      if (!res.ok) {
        const dataRes = await res.json().catch(() => ({}));
        if (Array.isArray(dataRes?.errors)) {
          const nextErrors: Record<string, string> = {};
          dataRes.errors.forEach((issue: { path?: string[]; message?: string }) => {
            const field = issue.path?.[0];
            if (field && issue.message) {
              nextErrors[field] = issue.message;
            }
          });
          if (Object.keys(nextErrors).length > 0) {
            setAddErrors(nextErrors);
            return;
          }
        }
        toast.error(dataRes?.error ?? "Errore durante il salvataggio");
        return;
      }

      toast.success("Dipendente aggiunto con successo");
      resetAddForm();
      setAddModalOpen(false);
      await refetch();
    } catch (error) {
      console.error("Errore creazione dipendente:", error);
      toast.error("Errore durante il salvataggio");
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Dipendenti</h1>
          <p className="text-sm text-muted-foreground">
            Consulta i dipendenti associati ai tuoi corsi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={exportUrl}
            className="btn-brand-outline rounded-md px-4 py-2 text-sm"
          >
            Esporta CSV
          </a>
          <BrandedButton
            size="sm"
            onClick={() => {
              resetAddForm();
              setAddModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi dipendente
          </BrandedButton>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background px-3 py-2 pl-9 text-sm"
              placeholder="Cerca nome, cognome o CF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={editionId}
            onChange={(event) => setEditionId(event.target.value)}
            aria-label="Filtro edizione"
          >
            <option value="">Tutte le edizioni</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={certStatus}
            onChange={(event) => setCertStatus(event.target.value)}
            aria-label="Filtro attestati"
          >
            <option value="all">Tutti gli attestati</option>
            <option value="with">Con attestato</option>
            <option value="without">Senza attestato</option>
          </select>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
            aria-label="Ordinamento dipendenti"
          >
            <option value="desc">Piu recenti</option>
            <option value="asc">Piu vecchi</option>
          </select>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalCount} dipendenti trovati
            </span>
            <button
              type="button"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm text-muted-foreground"
              onClick={resetFilters}
            >
              <X className="mr-1 h-4 w-4" />
              Resetta
            </button>
          </div>
        </div>
      </div>

      <EmployeeTable
        employees={pagedEmployees}
        basePath="/dipendenti"
        isLoading={isLoading}
        useBranding
        onDelete={handleDeleteClick}
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Pagina {currentPage} di {totalPages}
        </span>
        <div className="flex gap-2">
          <BrandedButton
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Precedente
          </BrandedButton>
          <BrandedButton
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Successiva
          </BrandedButton>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Elimina dipendente"
        description="Sei sicuro di voler eliminare questo dipendente?"
        itemName={
          employeeToDelete
            ? `${employeeToDelete.nome} ${employeeToDelete.cognome}`
            : undefined
        }
        isDeleting={isDeleting}
        warningMessage={
          employeeToDelete &&
          (employeeToDelete.registrationsCount > 0 ||
            employeeToDelete.certificatesCount > 0)
            ? `Questo dipendente ha ${employeeToDelete.registrationsCount} iscrizioni a corsi e ${employeeToDelete.certificatesCount} attestati. Tutti i dati associati verranno eliminati.`
            : "Questa azione non puo essere annullata."
        }
      />

      {addModalOpen && addModalMounted
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => {
                  if (!addSaving) setAddModalOpen(false);
                }}
                aria-hidden="true"
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg"
                  role="dialog"
                  aria-modal="true"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2 className="text-lg font-semibold">Aggiungi dipendente</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Inserisci i dati del nuovo dipendente.
                  </p>
                  <form className="mt-4 space-y-4" onSubmit={handleAddEmployee}>
                    <FormRequiredLegend />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2 text-sm">
                        <FormLabel required>Nome</FormLabel>
                        <input
                          className={`rounded-md border bg-background px-3 py-2 ${
                            addErrors.nome
                              ? "border-red-500 focus-visible:outline-red-500"
                              : ""
                          }`}
                          value={addForm.nome}
                          onChange={(event) =>
                            updateAddField("nome", event.target.value)
                          }
                        />
                        <FormFieldError message={addErrors.nome} />
                      </div>
                      <div className="flex flex-col gap-2 text-sm">
                        <FormLabel required>Cognome</FormLabel>
                        <input
                          className={`rounded-md border bg-background px-3 py-2 ${
                            addErrors.cognome
                              ? "border-red-500 focus-visible:outline-red-500"
                              : ""
                          }`}
                          value={addForm.cognome}
                          onChange={(event) =>
                            updateAddField("cognome", event.target.value)
                          }
                        />
                        <FormFieldError message={addErrors.cognome} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <FormLabel required>Codice Fiscale</FormLabel>
                      <input
                        className={`rounded-md border bg-background px-3 py-2 ${
                          addErrors.codiceFiscale
                            ? "border-red-500 focus-visible:outline-red-500"
                            : ""
                        }`}
                        value={addForm.codiceFiscale}
                        onChange={(event) =>
                          updateAddField(
                            "codiceFiscale",
                            event.target.value.toUpperCase()
                          )
                        }
                      />
                      <FormFieldError message={addErrors.codiceFiscale} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-2 text-sm">
                        <FormLabel>Email</FormLabel>
                        <input
                          type="email"
                          className={`rounded-md border bg-background px-3 py-2 ${
                            addErrors.email
                              ? "border-red-500 focus-visible:outline-red-500"
                              : ""
                          }`}
                          value={addForm.email}
                          onChange={(event) =>
                            updateAddField("email", event.target.value)
                          }
                        />
                        <FormFieldError message={addErrors.email} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <BrandedButton
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!addSaving) setAddModalOpen(false);
                        }}
                      >
                        Annulla
                      </BrandedButton>
                      <BrandedButton type="submit" disabled={addSaving}>
                        {addSaving ? "Salvataggio..." : "Aggiungi"}
                      </BrandedButton>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default function ClientDipendentiPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      }
    >
      <ClientDipendentiContent />
    </Suspense>
  );
}
