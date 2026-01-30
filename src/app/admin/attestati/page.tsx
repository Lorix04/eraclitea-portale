export default function AdminAttestatiPage() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold">Attestati</h1>
      <p className="mt-2 text-sm text-muted-foreground">Gestione attestati.</p>
      <div className="mt-4">
        <a
          href="/admin/attestati/upload"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Vai a upload attestati
        </a>
      </div>
    </div>
  );
}
