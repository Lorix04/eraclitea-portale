"use client";

import { useQuery } from "@tanstack/react-query";
import DashboardCards from "@/components/DashboardCards";
import { SkeletonCard } from "@/components/ui/skeleton-card";

type CourseListItem = {
  id: string;
  title: string;
  deadlineRegistry?: string | null;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  registrationsCount: number;
  completedCount: number;
  isNew: boolean;
};

type CertificateItem = {
  id: string;
  employee: { nome: string; cognome: string };
  course?: { title: string } | null;
};

type Stats = {
  totalEmployees: number;
  totalCertificates: number;
  coursesCompleted: number;
  expiringCerts: number;
};

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  return res.json();
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => fetchJson("/api/dashboard/stats"),
    staleTime: 2 * 60 * 1000,
  });

  const { data: coursesResponse } = useQuery<{ data: CourseListItem[] }>({
    queryKey: ["courses", "dashboard"],
    queryFn: () => fetchJson("/api/corsi/cliente?all=true&limit=20"),
  });

  const { data: certificatesResponse } = useQuery<{ data: CertificateItem[] }>({
    queryKey: ["certificates", "dashboard"],
    queryFn: () => fetchJson("/api/attestati/cliente?limit=5"),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div role="alert" className="rounded-lg border bg-card p-6 text-sm">
        Errore nel caricamento della dashboard.
      </div>
    );
  }

  const courses = coursesResponse?.data ?? [];
  const latestCertificates = (certificatesResponse?.data ?? []).map((cert) => ({
    id: cert.id,
    employeeName: `${cert.employee.cognome} ${cert.employee.nome}`,
    courseTitle: cert.course?.title ?? "Esterno",
  }));

  const availableCourses = courses
    .filter((course) => course.status === "AVAILABLE")
    .slice(0, 5)
    .map((course) => ({
      id: course.id,
      title: course.title,
      deadlineRegistry: course.deadlineRegistry ?? null,
      isNew: course.isNew,
    }));

  const pendingCourses = courses
    .filter((course) => course.status !== "COMPLETED")
    .slice(0, 5)
    .map((course) => ({
      id: course.id,
      title: course.title,
      total: course.registrationsCount,
      completed: course.completedCount,
      statusLabel: course.registrationsCount === 0 ? "Da compilare" : "In compilazione",
    }));

  return (
    <DashboardCards
      availableCourses={availableCourses}
      pendingCourses={pendingCourses}
      latestCertificates={latestCertificates}
      stats={stats}
    />
  );
}
