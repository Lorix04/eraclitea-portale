import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Privacy Policy - Sapienta",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#0A0A0A] dark:text-white">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0A0A0A]/90">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icons/i-down-remove.png" alt="Sapienta" width={32} height={32} />
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

      <main className="px-6 pb-16 pt-28">
        <article className="mx-auto w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1
            className="text-3xl font-semibold md:text-4xl"
            style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
          >
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            La presente informativa descrive le modalità di trattamento dei dati personali degli utenti del Portale Sapienta.
          </p>

          <section className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Titolare del trattamento</h2>
              <p className="mt-2">
                Sapienta — Portale Formazione
                <br />
                Indirizzo: [inserire indirizzo completo]
                <br />
                Email: [inserire email privacy]
                <br />
                P.IVA: [inserire P.IVA]
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tipologie di dati raccolti</h2>
              <p className="mt-2">
                Possono essere trattati dati anagrafici e di contatto (nome, cognome, email, telefono), dati identificativi e fiscali (es. codice fiscale), dati professionali e dati di navigazione tecnici.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Finalità del trattamento</h2>
              <p className="mt-2">
                I dati sono trattati per: gestione account e accessi, erogazione dei servizi di formazione, comunicazioni di servizio, gestione operativa delle attività formative, adempimenti contrattuali e obblighi di legge.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Base giuridica</h2>
              <p className="mt-2">
                Il trattamento si fonda su esecuzione del contratto, adempimento di obblighi legali e legittimo interesse del titolare alla gestione e sicurezza del servizio.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modalità del trattamento</h2>
              <p className="mt-2">
                Il trattamento avviene con strumenti informatici e telematici, secondo principi di liceità, correttezza e trasparenza, adottando misure tecniche e organizzative adeguate alla protezione dei dati.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Conservazione dei dati</h2>
              <p className="mt-2">
                I dati sono conservati per la durata del rapporto contrattuale e, successivamente, per il tempo necessario all’adempimento degli obblighi di legge e alla tutela dei diritti del titolare.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Diritti dell’interessato</h2>
              <p className="mt-2">
                L’interessato può esercitare i diritti previsti dagli artt. 15-22 GDPR, tra cui accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revoca del consenso (ove applicabile).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Comunicazione e diffusione</h2>
              <p className="mt-2">
                I dati non sono diffusi. Possono essere comunicati a soggetti terzi nominati responsabili del trattamento per finalità strettamente connesse all’erogazione del servizio.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cookie</h2>
              <p className="mt-2">
                Per informazioni sui cookie utilizzati dal sito, consulta la{" "}
                <Link href="/cookie-policy" className="underline underline-offset-2 hover:text-black dark:hover:text-white">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contatti</h2>
              <p className="mt-2">
                Per richieste relative ai dati personali e all’esercizio dei diritti: [inserire email dedicata privacy].
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Aggiornamento</h2>
              <p className="mt-2">Ultimo aggiornamento: 26 febbraio 2026.</p>
            </div>
          </section>
        </article>
      </main>

      <footer className="border-t border-gray-200 py-8 dark:border-white/10">
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

