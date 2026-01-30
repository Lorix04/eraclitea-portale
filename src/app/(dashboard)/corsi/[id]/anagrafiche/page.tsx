import AnagraficheResponsive from "@/components/AnagraficheResponsive";

const initialRows = [
  {
    nome: "",
    cognome: "",
    codiceFiscale: "",
    dataNascita: "",
    luogoNascita: "",
    email: "",
    mansione: "",
    note: "",
  },
];

export default function AnagrafichePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Anagrafiche</h1>
        <p className="text-sm text-muted-foreground">
          Compila i dati dei dipendenti con validazione del Codice Fiscale.
        </p>
      </div>
      <AnagraficheResponsive initialData={initialRows} />
    </div>
  );
}
