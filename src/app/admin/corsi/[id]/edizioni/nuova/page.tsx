"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ItalianDateInput } from "@/components/ui/italian-date-input";
import { FormLabel } from "@/components/ui/FormLabel";
import { FormFieldError } from "@/components/ui/FormFieldError";
import { FormRequiredLegend } from "@/components/ui/FormRequiredLegend";

type ClientOption = {
  id: string;
  ragioneSociale: string;
  categories?: { id: string; name: string }[];
};

export default function NewEditionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [courseVisibility, setCourseVisibility] = useState<{
    type: "ALL" | "SELECTED_CLIENTS" | "BY_CATEGORY";
    clientIds: string[];
    categoryIds: string[];
  }>({ type: "ALL", clientIds: [], categoryIds: [] });
  const [clientId, setClientId] = useState("");
  const [nextEditionNumber, setNextEditionNumber] = useState<number | null>(null);
  const [loadingEditionNumber, setLoadingEditionNumber] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deadlineRegistry, setDeadlineRegistry] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadCourseVisibility = async () => {
      const res = await fetch(`/api/corsi/${params.id}`);
      const json = await res.json().catch(() => ({}));
      const course = json?.data;
      if (!course) return;
      setCourseVisibility({
        type: course.visibilityType ?? "ALL",
        clientIds: (course.visibility ?? []).map((entry: any) => entry.clientId),
        categoryIds: (course.visibilityCategories ?? []).map(
          (entry: any) => entry.categoryId
        ),
      });
    };
    loadCourseVisibility();
  }, [params.id]);

  useEffect(() => {
    const loadClients = async () => {
      const res = await fetch("/api/admin/clienti");
      const json = await res.json();
      const data = json.data ?? [];
      setClients(
        data.map((client: any) => ({
          id: client.id,
          ragioneSociale: client.ragioneSociale,
          categories: client.categories ?? [],
        }))
      );
    };
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (courseVisibility.type === "ALL") return true;
      if (courseVisibility.type === "SELECTED_CLIENTS") {
        return courseVisibility.clientIds.includes(client.id);
      }
      if (courseVisibility.type === "BY_CATEGORY") {
        return (client.categories ?? []).some((category) =>
          courseVisibility.categoryIds.includes(category.id)
        );
      }
      return true;
    });
  }, [clients, courseVisibility]);

  useEffect(() => {
    if (!clientId) return;
    const allowed = filteredClients.some((client) => client.id === clientId);
    if (!allowed) {
      setClientId("");
      setNextEditionNumber(null);
    }
  }, [clientId, filteredClients]);

  useEffect(() => {
    const loadNextEditionNumber = async () => {
      if (!clientId) {
        setNextEditionNumber(null);
        return;
      }
      setLoadingEditionNumber(true);
      const res = await fetch(
        `/api/corsi/${params.id}/edizioni?clientId=${clientId}&limit=1`
      );
      const json = await res.json().catch(() => ({}));
      const lastEdition = json.data?.[0]?.editionNumber ?? 0;
      setNextEditionNumber(lastEdition + 1);
      setLoadingEditionNumber(false);
    };
    loadNextEditionNumber();
  }, [clientId, params.id]);

  const selectedClient = filteredClients.find((client) => client.id === clientId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const fieldErrors: Record<string, string> = {};
    if (!clientId) fieldErrors.clientId = "Questo campo e obbligatorio";
    if (!startDate) fieldErrors.startDate = "Questo campo e obbligatorio";
    if (!endDate) fieldErrors.endDate = "Questo campo e obbligatorio";
    if (!deadlineRegistry) {
      fieldErrors.deadlineRegistry = "Questo campo e obbligatorio";
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    const res = await fetch(`/api/corsi/${params.id}/edizioni`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        startDate,
        endDate,
        deadlineRegistry,
        status,
        notes,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Errore durante la creazione.");
      return;
    }

    const json = await res.json();
    toast.success("Edizione creata");
    router.push(`/admin/corsi/${params.id}/edizioni/${json.data.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Nuova edizione</h1>
        <p className="text-sm text-muted-foreground">
          Crea una nuova edizione per questo corso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormRequiredLegend />

        <div className="flex flex-col gap-2">
          <FormLabel required>Cliente</FormLabel>
          <select
            className={`rounded-md border bg-background px-3 py-2 ${
              errors.clientId ? "border-red-500 focus-visible:outline-red-500" : ""
            }`}
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              if (errors.clientId) {
                setErrors((prev) => ({ ...prev, clientId: "" }));
              }
            }}
          >
            <option value="">Seleziona cliente</option>
            {filteredClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.ragioneSociale}
              </option>
            ))}
          </select>
          <FormFieldError message={errors.clientId} />
        </div>

        <label className="flex flex-col gap-2 text-sm">
          Numero edizione
          <input
            className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
            value={
              loadingEditionNumber
                ? "Calcolo..."
                : nextEditionNumber
                  ? `Edizione #${nextEditionNumber}${
                      selectedClient?.ragioneSociale
                        ? ` per ${selectedClient.ragioneSociale}`
                        : ""
                    }`
                  : ""
            }
            readOnly
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <ItalianDateInput
            label="Data inizio"
            value={startDate}
            onChange={(value) => {
              setStartDate(value);
              if (errors.startDate) {
                setErrors((prev) => ({ ...prev, startDate: "" }));
              }
            }}
            required
            error={errors.startDate}
          />
          <ItalianDateInput
            label="Data fine"
            value={endDate}
            onChange={(value) => {
              setEndDate(value);
              if (errors.endDate) {
                setErrors((prev) => ({ ...prev, endDate: "" }));
              }
            }}
            required
            error={errors.endDate}
          />
          <ItalianDateInput
            label="Deadline anagrafiche"
            value={deadlineRegistry}
            onChange={(value) => {
              setDeadlineRegistry(value);
              if (errors.deadlineRegistry) {
                setErrors((prev) => ({ ...prev, deadlineRegistry: "" }));
              }
            }}
            required
            error={errors.deadlineRegistry}
          />
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Stato iniziale</FormLabel>
          <select
            className="rounded-md border bg-background px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="DRAFT">Bozza</option>
            <option value="PUBLISHED">Aperto</option>
            <option value="CLOSED">Chiuso</option>
            <option value="ARCHIVED">Archiviato</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <FormLabel>Note</FormLabel>
          <textarea
            className="min-h-[120px] rounded-md border bg-background px-3 py-2"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <Link
            href={`/admin/corsi/${params.id}`}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Annulla
          </Link>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            disabled={saving}
          >
            {saving ? "Creazione..." : "Crea edizione"}
          </button>
        </div>
      </form>
    </div>
  );
}
