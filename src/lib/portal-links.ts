/**
 * Centralized, role-aware deep links for the portal.
 *
 * Convention: every email/notification about a specific resource must link to
 * THAT resource (deep link), not a generic list page — and the link must match
 * the recipient's role (admin → /admin/..., client → /..., teacher → /docente/...).
 *
 * Route semantics (verified against the app router):
 * - Admin edition detail:  /admin/corsi/{courseId}/edizioni/{editionId}  (tabs via ?tab=)
 * - Client edition detail:  /corsi/{editionId}   ← keyed by the EDITION id, NOT the course id
 *   (the client "anagrafiche" view lives inside this page; /corsi/{id}/anagrafiche redirects here)
 * - Client certificates:    /attestati           (global resource list; no per-certificate page)
 * - Tickets:  admin → /admin/ticket/{id} · client → /supporto/{id} · teacher → /docente/supporto/{id}
 *
 * `paths.*` return RELATIVE paths (for client-side router.push in the app).
 * The exported `*Url(...)` helpers return ABSOLUTE URLs (for emails) using the
 * SAME base env already used elsewhere (NEXTAUTH_URL), never a new one.
 */

const PORTAL_URL = process.env.NEXTAUTH_URL || "https://sapienta.it";

export type PortalRole = "ADMIN" | "CLIENT" | "TEACHER";

/** Prefix a relative portal path with the absolute base URL. */
export function absolutePortalUrl(path: string): string {
  return `${PORTAL_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Relative path builders (use with router.push inside the app). */
export const paths = {
  // Admin
  adminEdition: (courseId: string, editionId: string, tab?: string) =>
    `/admin/corsi/${courseId}/edizioni/${editionId}${tab ? `?tab=${tab}` : ""}`,
  adminEditions: () => `/admin/edizioni`,
  adminAttestati: () => `/admin/attestati`,
  adminTeacher: (teacherId: string) => `/admin/docenti/${teacherId}`,
  // Client (route keyed by editionId)
  clientEdition: (editionId: string) => `/corsi/${editionId}`,
  clientAnagrafiche: (editionId: string) => `/corsi/${editionId}`,
  clientCourses: () => `/corsi`,
  clientAttestati: () => `/attestati`,
  // Teacher
  teacherLessons: () => `/docente/lezioni`,
  teacherLesson: (lessonId: string) => `/docente/lezioni/${lessonId}`,
  // Tickets (role-aware)
  ticket: (role: PortalRole | string | null | undefined, ticketId: string) =>
    role === "ADMIN"
      ? `/admin/ticket/${ticketId}`
      : role === "TEACHER"
        ? `/docente/supporto/${ticketId}`
        : `/supporto/${ticketId}`,
} as const;

// ── Absolute URL helpers (for emails) ──────────────────────────────────────

/** Admin edition detail (optionally a specific tab, e.g. "anagrafiche"/"materiali"). */
export function adminEditionUrl(courseId: string, editionId: string, tab?: string): string {
  return absolutePortalUrl(paths.adminEdition(courseId, editionId, tab));
}
export function adminEditionAnagraficheUrl(courseId: string, editionId: string): string {
  return adminEditionUrl(courseId, editionId, "anagrafiche");
}
export function adminEditionMaterialiUrl(courseId: string, editionId: string): string {
  return adminEditionUrl(courseId, editionId, "materiali");
}
export function adminEditionsUrl(): string {
  return absolutePortalUrl(paths.adminEditions());
}
/** Admin teacher detail (the /admin/docenti/[id] page is keyed by Teacher.id). */
export function adminTeacherUrl(teacherId: string): string {
  return absolutePortalUrl(paths.adminTeacher(teacherId));
}

/** Client edition detail (the page that also hosts the anagrafiche tab). */
export function clientEditionUrl(editionId: string): string {
  return absolutePortalUrl(paths.clientEdition(editionId));
}
export function clientAnagraficheUrl(editionId: string): string {
  return absolutePortalUrl(paths.clientAnagrafiche(editionId));
}
/** Client courses list — use when a specific edition no longer exists (e.g. deleted). */
export function clientCoursesUrl(): string {
  return absolutePortalUrl(paths.clientCourses());
}
export function clientAttestatiUrl(): string {
  return absolutePortalUrl(paths.clientAttestati());
}

/** Teacher lessons. */
export function teacherLessonsUrl(): string {
  return absolutePortalUrl(paths.teacherLessons());
}
export function teacherLessonUrl(lessonId: string): string {
  return absolutePortalUrl(paths.teacherLesson(lessonId));
}

/** Role-aware ticket detail. Defaults to the client path when role is unknown. */
export function ticketUrl(role: PortalRole | string | null | undefined, ticketId: string): string {
  return absolutePortalUrl(paths.ticket(role, ticketId));
}
