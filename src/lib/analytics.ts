// No-op analytics — Vercel Analytics removed (hosted on Hostinger)
const noop = () => {};

export const trackEvent = {
  login: noop,
  logout: noop,
  courseViewed: (_courseId: string) => {},
  coursePublished: (_courseId: string) => {},
  registrationSubmitted: (_courseId: string, _count: number) => {},
  certificateDownloaded: (_certificateId: string) => {},
  certificatesBulkDownload: (_count: number) => {},
  csvExported: (_courseId?: string) => {},
};
