import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";
import { prisma } from "@/lib/prisma";

export default async function AdminEditClientePage({
  params,
}: {
  params: { id: string };
}) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      users: { where: { role: "CLIENT" }, select: { email: true } },
      categories: true,
    },
  });

  if (!client) {
    notFound();
  }

  const initialData = {
    ragioneSociale: client.ragioneSociale,
    piva: client.piva,
    indirizzo: client.indirizzo ?? "",
    referenteNome: client.referenteNome,
    referenteEmail: client.referenteEmail,
    telefono: client.telefono ?? "",
    userEmail: client.users[0]?.email ?? client.referenteEmail,
    categoryIds: client.categories.map((entry) => entry.categoryId),
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">Modifica cliente</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Aggiorna i dati del cliente.
      </p>
      <div className="mt-6">
        <ClientForm clientId={client.id} initialData={initialData} />
      </div>
    </div>
  );
}
