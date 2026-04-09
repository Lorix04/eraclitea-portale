import { prisma } from "@/lib/prisma";
import { getEffectiveClientContext } from "@/lib/impersonate";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ProfiloPage() {
  const context = await getEffectiveClientContext();
  const clientId = context?.clientId;

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
      <h1 className="text-xl font-bold md:text-2xl">Profilo</h1>

      <div className="rounded-lg border bg-card p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Dati Azienda</h2>
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

      <div id="cambio-password" className="rounded-lg border bg-card p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Cambia Password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
