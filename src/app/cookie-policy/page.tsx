import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const technicalCookies = [
  {
    name: "next-auth.session-token / __Secure-next-auth.session-token",
    description: "Autenticazione e mantenimento della sessione utente.",
  },
  {
    name: "next-auth.csrf-token",
    description: "Protezione CSRF durante login e richieste sensibili.",
  },
  {
    name: "next-auth.callback-url",
    description: "Gestione del redirect dopo autenticazione.",
  },
  {
    name: "theme",
    description: "Memorizza la preferenza tema chiaro/scuro nelle pagine pubbliche.",
  },
  {
    name: "impersonate_admin_id / impersonate_client_id",
    description: "Supporto tecnico alla funzione di impersonazione per utenti admin.",
  },
  {
    name: "cookie_consent",
    description: "Memorizzazione della scelta cookie dell utente.",
  },
];

export const metadata = {
  title: "Cookie Policy - Sapienta",
};

export default function CookiePolicyPage() {
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
              Cookie Policy
            </h1>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
              Questa policy descrive i cookie utilizzati dal Portale Sapienta.
            </p>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Cosa sono i cookie
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                I cookie sono piccoli file di testo salvati sul dispositivo dell utente durante la navigazione. Consentono il funzionamento tecnico del sito e la memorizzazione di preferenze.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Cookie utilizzati da questo sito
              </h2>

              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Cookie tecnici (necessari)</h3>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Questi cookie sono indispensabili al funzionamento del portale e non richiedono consenso.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {technicalCookies.map((cookie) => (
                  <div key={cookie.name} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
                    <p className="mb-2 break-all font-mono text-sm text-gray-900 dark:text-gray-100">{cookie.name}</p>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{cookie.description}</p>
                  </div>
                ))}
              </div>

              <h3 className="mt-8 mb-2 text-lg font-semibold text-gray-900 dark:text-white">Cookie analitici</h3>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">Nessuno al momento.</p>

              <h3 className="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-white">Cookie di profilazione/marketing</h3>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">Nessuno al momento.</p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Come gestire i cookie
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                L utente puo configurare il browser per limitare o bloccare i cookie. La disattivazione dei cookie tecnici puo compromettere il corretto funzionamento del portale.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Base giuridica
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                I cookie tecnici sono trattati sulla base del legittimo interesse del titolare a garantire la sicurezza e l operativita del servizio. Eventuali cookie non tecnici saranno attivati solo previo consenso esplicito.
              </p>
            </section>

            <section>
              <h2 className="mt-10 mb-4 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900 dark:border-gray-700 dark:text-white sm:text-2xl">
                Contatti
              </h2>
              <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
                Per informazioni sul trattamento dei dati personali consulta la{" "}
                <Link href="/privacy-policy" className="font-medium text-amber-600 hover:underline dark:text-amber-400">
                  Privacy Policy
                </Link>
                .
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
