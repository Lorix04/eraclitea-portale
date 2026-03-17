"use client";

import Link from "next/link";
import { formatItalianDate } from "@/lib/date-utils";
import { Award, BookOpen, Download } from "lucide-react";
import { useBranding } from "@/components/BrandingProvider";

type AvailableCourse = {
  id: string;
  title: string;
  isNew?: boolean;
  deadlineRegistry?: string | Date | null;
};

type PendingCourse = {
  id: string;
  title: string;
  total: number;
  completed: number;
  statusLabel: string;
};

type CertificateItem = {
  id: string;
  employeeName: string;
  courseTitle: string;
};

type Stats = {
  totalEmployees: number;
  totalCertificates: number;
  coursesCompleted: number;
  expiringCerts: number;
};

type DashboardCardsProps = {
  availableCourses: AvailableCourse[];
  pendingCourses: PendingCourse[];
  latestCertificates: CertificateItem[];
  stats: Stats;
};

function formatDeadline(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return formatItalianDate(date);
}

export default function DashboardCards({
  availableCourses,
  pendingCourses,
  latestCertificates,
  stats,
}: DashboardCardsProps) {
  const { primaryColor } = useBranding();
  return (
    <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
      <div className="card-surface rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: primaryColor }} />
          <h3 className="text-base font-semibold md:text-lg">Corsi disponibili</h3>
        </div>
        <div className="mt-4 space-y-3">
          {availableCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun corso disponibile.</p>
          ) : (
            availableCourses.map((course) => (
              <div key={course.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{course.title}</span>
                  {course.isNew ? (
                    <span className="ml-2 rounded-full bg-accent/15 px-2 py-1 text-xs font-semibold text-accent-foreground">
                      NUOVO
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  Scadenza: {formatDeadline(course.deadlineRegistry)}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <Link href="/corsi" className="link-brand text-sm font-medium">
            Vedi tutti {"->"}
          </Link>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4 md:p-6">
        <h3 className="text-base font-semibold md:text-lg">Anagrafiche da compilare</h3>
        <div className="mt-4 space-y-4">
          {pendingCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna anagrafica in sospeso.
            </p>
          ) : (
            pendingCourses.map((course) => {
              const percent = course.total
                ? Math.round((course.completed / course.total) * 100)
                : 0;
              return (
                <div key={course.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{course.title}</span>
                    <span className="text-muted-foreground">
                      {course.total
                        ? `${course.completed}/${course.total} completate`
                        : "0 dipendenti"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-brand-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="inline-flex rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                    {course.statusLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5" style={{ color: primaryColor }} />
          <h3 className="text-base font-semibold md:text-lg">Ultimi attestati</h3>
        </div>
        <div className="mt-4 space-y-3">
          {latestCertificates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun attestato trovato.</p>
          ) : (
            latestCertificates.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{cert.employeeName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {cert.courseTitle}
                  </span>
                </div>
                <Link
                  href={`/api/attestati/${cert.id}/download`}
                  className="btn-brand-outline rounded-full px-2 py-1 text-xs"
                  aria-label="Scarica attestato"
                >
                  <Download className="h-4 w-4" style={{ color: primaryColor }} />
                </Link>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <Link href="/attestati" className="link-brand text-sm font-medium">
            Vedi tutti {"->"}
          </Link>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-4 md:p-6">
        <h3 className="text-base font-semibold md:text-lg">Riepilogo</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-3 text-center md:p-4">
            <div className="text-2xl font-bold md:text-3xl">{stats.totalEmployees}</div>
            <div className="text-xs text-muted-foreground md:text-sm">Dipendenti</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3 text-center md:p-4">
            <div className="text-2xl font-bold md:text-3xl">{stats.totalCertificates}</div>
            <div className="text-xs text-muted-foreground md:text-sm">Attestati</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3 text-center md:p-4">
            <div className="text-2xl font-bold md:text-3xl">{stats.coursesCompleted}</div>
            <div className="text-xs text-muted-foreground md:text-sm">Corsi completati</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3 text-center md:p-4">
            <div className="text-2xl font-bold text-orange-600 md:text-3xl">
              {stats.expiringCerts}
            </div>
            <div className="text-xs text-muted-foreground md:text-sm">In scadenza</div>
          </div>
        </div>
      </div>
    </div>
  );
}





