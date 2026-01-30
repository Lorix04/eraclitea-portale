"use client";

import { useReportWebVitals } from "next/web-vitals";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Web Vitals]", metric);
    }
    if (process.env.NODE_ENV === "production") {
      fetch("/api/analytics/vitals", {
        method: "POST",
        body: JSON.stringify(metric),
      }).catch(() => null);
    }
  });

  return null;
}
