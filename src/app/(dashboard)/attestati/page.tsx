"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CertificateFilters from "@/components/CertificateFilters";
import CertificateTable from "@/components/CertificateTable";
import { useDebounce } from "@/hooks/useDebounce";

type Filters = {
  courseEditionId?: string;
  employeeId?: string;
  year?: number;
  status?: "valid" | "expiring" | "expired";
};

type CertificateResponse = {
  data: Array<{
    id: string;
    employee: { nome: string; cognome: string };
    courseEdition?: {
      id: string;
      editionNumber: number;
      course?: { title: string } | null;
    } | null;
    achievedAt?: string | null;
    expiresAt?: string | null;
    uploadedAt?: string | null;
    uploadedByEmail?: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  expiringCount?: number;
};

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch certificates");
  return res.json();
}

export default function ClientAttestatiPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const debouncedFilters = useDebounce(filters, 300);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedFilters.courseEditionId) {
      params.set("courseEditionId", debouncedFilters.courseEditionId);
    }
    if (debouncedFilters.employeeId) {
      params.set("employeeId", debouncedFilters.employeeId);
    }
    if (debouncedFilters.year) params.set("year", String(debouncedFilters.year));
    if (debouncedFilters.status) params.set("status", debouncedFilters.status);
    params.set("page", String(page));
    return params.toString();
  }, [debouncedFilters, page]);

  const { data, isLoading, isFetching, isError } = useQuery<CertificateResponse>({
    queryKey: ["certificates", "cliente", debouncedFilters, page],
    queryFn: () => fetchJson(`/api/attestati/cliente?${queryString}`),
    placeholderData: (prev) => prev,
  });

  const { data: filterOptions } = useQuery<{
    courses: { data: Array<{ id: string; title: string; editions: Array<{ id: string; editionNumber: number }> }> };
    employees: { data: Array<{ id: string; nome: string; cognome: string }> };
  }>({
    queryKey: ["certificates", "filterOptions"],
    queryFn: async () => {
      const [coursesRes, employeesRes] = await Promise.all([
        fetch("/api/corsi/cliente?tab=tutti&all=true"),
        fetch("/api/anagrafiche"),
      ]);
      if (!coursesRes.ok || !employeesRes.ok) {
        throw new Error("Failed to fetch filter options");
      }
      return {
        courses: await coursesRes.json(),
        employees: await employeesRes.json(),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const editionsOptions = useMemo(() => {
    const courses = filterOptions?.courses?.data ?? [];
    return courses.flatMap((course) =>
      (course.editions ?? []).map((edition) => ({
        id: edition.id,
        label: `${course.title} · Ed. #${edition.editionNumber}`,
      }))
    );
  }, [filterOptions?.courses?.data]);

  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit || 20)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Attestati</h1>
          <p className="text-sm text-muted-foreground">
            Consulta e scarica gli attestati.
          </p>
        </div>
        {data?.expiringCount ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-800">
            {data.expiringCount} attestati in scadenza
          </div>
        ) : null}
      </div>

      <CertificateFilters
        filters={filters}
        options={{
          editions: editionsOptions,
          employees: filterOptions?.employees.data,
        }}
        onChange={handleFilterChange}
      />

      <CertificateTable
        certificates={isError ? [] : data?.data ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        pagination={{
          page,
          totalPages,
          onPageChange: setPage,
        }}
      />

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Si e verificato un errore nel caricamento dei dati. Riprova piu tardi.
        </div>
      ) : null}
    </div>
  );
}
