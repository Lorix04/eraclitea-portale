"use client";

import { Download } from "lucide-react";
import { formatItalianDate } from "@/lib/date-utils";

type CertificateRow = {
  id: string;
  achievedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  uploadedAt?: string | Date | null;
  course?: { id: string; title: string } | null;
};

type EmployeeCertificatesListProps = {
  certificates: CertificateRow[];
};

export default function EmployeeCertificatesList({
  certificates,
}: EmployeeCertificatesListProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Corso</th>
            <th className="px-4 py-3">Rilasciato</th>
            <th className="px-4 py-3">Scadenza</th>
            <th className="px-4 py-3">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {certificates.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                Nessun attestato disponibile.
              </td>
            </tr>
          ) : (
            certificates.map((cert) => (
              <tr key={cert.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {cert.course?.title ?? "Esterno"}
                </td>
                <td className="px-4 py-3">
                  {formatItalianDate(cert.achievedAt) || "-"}
                </td>
                <td className="px-4 py-3">
                  {formatItalianDate(cert.expiresAt) || "-"}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/api/attestati/${cert.id}/download`}
                    className="btn-brand-outline inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs"
                  >
                    <Download className="h-4 w-4" />
                    Scarica
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
