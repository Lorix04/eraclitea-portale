import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ProfiloPage() {
  const session = await getServerSession(authOptions);
  const clientId = session?.user.clientId;

  if (!clientId) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Nessun cliente associato.</p>
      </div>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Cliente non trovato.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profilo</h1>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Dati Azienda</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Ragione Sociale</p>
            <p className="text-lg font-medium">{client.ragioneSociale}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Partita IVA</p>
            <p className="text-lg font-medium">{client.piva}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Referente</p>
            <p>{client.referenteNome}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p>{client.referenteEmail}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Per modificare i dati aziendali contatta l&apos;amministratore.
        </p>
      </div>

      <div id="cambio-password" className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Cambia Password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

