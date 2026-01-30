import Link from "next/link";
import { formatItalianDate } from "@/lib/date-utils";
import { Award, BookOpen, Download } from "lucide-react";

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
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-surface rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Corsi disponibili</h3>
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
          <Link href="/corsi" className="text-sm font-medium text-primary">
            Vedi tutti {"->"}
          </Link>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Anagrafiche da compilare</h3>
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
                      className="h-2 rounded-full bg-primary"
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

      <div className="card-surface rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Ultimi attestati</h3>
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
                  className="rounded-full border border-primary/20 px-2 py-1 text-xs text-primary transition hover:bg-primary/10"
                  aria-label="Scarica attestato"
                >
                  <Download className="h-4 w-4" />
                </Link>
              </div>
            ))
          )}
        </div>
        <div className="mt-4">
          <Link href="/attestati" className="text-sm font-medium text-primary">
            Vedi tutti {"->"}
          </Link>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Riepilogo</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="text-3xl font-bold">{stats.totalEmployees}</div>
            <div className="text-sm text-muted-foreground">Dipendenti</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="text-3xl font-bold">{stats.totalCertificates}</div>
            <div className="text-sm text-muted-foreground">Attestati</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="text-3xl font-bold">{stats.coursesCompleted}</div>
            <div className="text-sm text-muted-foreground">Corsi completati</div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {stats.expiringCerts}
            </div>
            <div className="text-sm text-muted-foreground">In scadenza</div>
          </div>
        </div>
      </div>
    </div>
  );
}
