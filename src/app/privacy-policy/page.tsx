import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Privacy Policy - Sapienta",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/90">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icons/apple-touch-icon.png" alt="Sapienta" width={32} height={32} />
            <span
              className="text-lg font-semibold tracking-[0.2em] text-gray-900 dark:text-white"
              style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
            >
              SAPIENTA
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-[#EAB308] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15]"
            >
              Area Clienti
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <article className="my-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:my-12 sm:p-8 lg:p-12">
            <h1
              className="mb-4 text-3xl font-bold sm:text-4xl"
              style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
            >
              Privacy Policy
            </h1>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
              La presente informativa descrive le modalita di trattamento dei dati personali degli utenti del Portale Sapienta.
            </p>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Titolare del trattamento
              </h2>
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50 sm:p-6">
                <p className="mb-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">Denominazione:</span> Accademia Eraclitea S.R.L.
                </p>
                <p className="mb-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">Indirizzo:</span> Viale della Liberta, 106, 95129 Catania (CT)
                </p>
                <p className="mb-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">Email:</span> segreteria@eraclitea.it
                </p>
                <p className="mb-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">PEC:</span> eraclitea@pec.it
                </p>
                <p className="mb-2 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">P.IVA:</span> 04255790877
                </p>
                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">Telefono:</span> +39 095 449778
                </p>
              </div>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Tipologie di dati raccolti
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Possono essere trattati dati anagrafici e di contatto (nome, cognome, email, telefono), dati identificativi e fiscali (es. codice fiscale), dati professionali e dati di navigazione tecnici.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Finalita del trattamento
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                I dati sono trattati per: gestione account e accessi, erogazione dei servizi di formazione, comunicazioni di servizio, gestione operativa delle attivita formative, adempimenti contrattuali e obblighi di legge.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Base giuridica
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Il trattamento si fonda su esecuzione del contratto, adempimento di obblighi legali e legittimo interesse del titolare alla gestione e sicurezza del servizio.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Modalita del trattamento
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Il trattamento avviene con strumenti informatici e telematici, secondo principi di liceita, correttezza e trasparenza, adottando misure tecniche e organizzative adeguate alla protezione dei dati.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Conservazione dei dati
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                I dati sono conservati per la durata del rapporto contrattuale e, successivamente, per il tempo necessario all adempimento degli obblighi di legge e alla tutela dei diritti del titolare.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Diritti dell interessato
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                L interessato puo esercitare i diritti previsti dagli artt. 15-22 GDPR, tra cui accesso, rettifica, cancellazione, limitazione, portabilita, opposizione e revoca del consenso (ove applicabile).
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Comunicazione e diffusione
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                I dati non sono diffusi. Possono essere comunicati a soggetti terzi nominati responsabili del trattamento per finalita strettamente connesse all erogazione del servizio.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Cookie
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Per informazioni sui cookie utilizzati dal sito, consulta la{" "}
                <Link href="/cookie-policy" className="font-medium text-amber-600 hover:underline dark:text-amber-400">
                  Cookie Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Contatti
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Per richieste relative ai dati personali e all esercizio dei diritti: segreteria@eraclitea.it (PEC: eraclitea@pec.it).
              </p>
            </section>

            <p className="mt-10 text-sm italic text-gray-500 dark:text-gray-400">
              Ultimo aggiornamento: 26 febbraio 2026.
            </p>
          </article>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 dark:border-gray-700">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Sapienta - Portale Formazione. Tutti i diritti riservati.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/privacy-policy" className="underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/cookie-policy" className="underline-offset-2 hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
