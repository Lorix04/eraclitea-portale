import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Cookie Policy - Sapienta",
};

export default function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Questa policy descrive i cookie utilizzati dal Portale Sapienta.
          </p>

          <section className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cosa sono i cookie</h2>
              <p className="mt-2">
                I cookie sono piccoli file di testo salvati sul dispositivo dell’utente durante la navigazione. Consentono il funzionamento tecnico del sito e la memorizzazione di preferenze.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cookie utilizzati da questo sito</h2>
              <div className="mt-3 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cookie tecnici (necessari)</h3>
                  <p className="mt-1">
                    Questi cookie sono indispensabili al funzionamento del portale e non richiedono consenso.
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-6">
                    <li>
                      <code>next-auth.session-token</code> / <code>__Secure-next-auth.session-token</code>: autenticazione sessione utente
                    </li>
                    <li>
                      <code>next-auth.csrf-token</code>: protezione CSRF
                    </li>
                    <li>
                      <code>next-auth.callback-url</code>: gestione redirect dopo login
                    </li>
                    <li>
                      <code>theme</code>: preferenza tema chiaro/scuro
                    </li>
                    <li>
                      <code>impersonate_admin_id</code> / <code>impersonate_client_id</code>: funzionalità admin di impersonazione
                    </li>
                    <li>
                      <code>cookie_consent</code>: memorizzazione della scelta cookie
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cookie analitici</h3>
                  <p className="mt-1">Nessuno al momento.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cookie di profilazione/marketing</h3>
                  <p className="mt-1">Nessuno al momento.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Come gestire i cookie</h2>
              <p className="mt-2">
                L’utente può configurare il browser per limitare o bloccare i cookie. La disattivazione dei cookie tecnici può compromettere il corretto funzionamento del portale.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Base giuridica</h2>
              <p className="mt-2">
                I cookie tecnici sono trattati sulla base del legittimo interesse del titolare a garantire la sicurezza e l’operatività del servizio. Eventuali cookie non tecnici saranno attivati solo previo consenso esplicito.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contatti</h2>
              <p className="mt-2">
                Per informazioni sul trattamento dei dati personali consulta la{" "}
                <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-black dark:hover:text-white">
                  Privacy Policy
                </Link>
                .
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

