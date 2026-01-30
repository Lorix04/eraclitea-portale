import { formatItalianDateTime } from "@/lib/date-utils";
﻿export default function RegistrationItem({
  registration,
}: {
  registration: {
    id: string;
    updatedAt: string;
    client: { ragioneSociale: string };
    course: { title: string };
    employee: { nome: string; cognome: string };
  };
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">{registration.course.title}</p>
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
