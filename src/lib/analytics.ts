import { track } from "@vercel/analytics";

export const trackEvent = {
  login: () => track("login"),
  logout: () => track("logout"),
  courseViewed: (courseId: string) => track("course_viewed", { courseId }),
  coursePublished: (courseId: string) => track("course_published", { courseId }),
  registrationSubmitted: (courseId: string, count: number) =>
    track("registration_submitted", { courseId, employeeCount: count }),
  certificateDownloaded: (certificateId: string) =>
    track("certificate_downloaded", { certificateId }),
  certificatesBulkDownload: (count: number) =>
    track("certificates_bulk_download", { count }),
  csvExported: (courseId?: string) =>
    track("csv_exported", { courseId: courseId || "all" }),
};
