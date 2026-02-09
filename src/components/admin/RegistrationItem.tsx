import { formatItalianDateTime } from "@/lib/date-utils";

export default function RegistrationItem({
  registration,
}: {
  registration: {
    id: string;
    updatedAt: string;
    client: { ragioneSociale: string };
    courseEdition?: {
      editionNumber?: number | null;
      course?: { title: string } | null;
    } | null;
    employee: { nome: string; cognome: string };
  };
}) {
  const courseTitle = registration.courseEdition?.course?.title ?? "Corso";
  const editionNumber = registration.courseEdition?.editionNumber;
  const editionLabel = editionNumber ? ` (Ed. #${editionNumber})` : "";

  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">
          {courseTitle}
          {editionLabel}
        </p>
        <p className="text-xs text-muted-foreground">
          {registration.client.ragioneSociale} - {registration.employee.cognome} {registration.employee.nome}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatItalianDateTime(registration.updatedAt)}
      </span>
    </div>
  );
}
