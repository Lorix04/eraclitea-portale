import ClientForm from "@/components/ClientForm";

export default function AdminNuovoClientePage() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">Nuovo cliente</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea un nuovo profilo aziendale.
      </p>
      <div className="mt-6">
        <ClientForm />
      </div>
    </div>
  );
}
