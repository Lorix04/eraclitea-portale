"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUp,
  Award,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileUp,
  GraduationCap,
  History,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  Mail,
  ScrollText,
  Search,
  UserCircle,
  Users,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type GuideRole = "ADMIN" | "CLIENT";

type MockupKind =
  | "login"
  | "dashboard"
  | "courses"
  | "spreadsheet"
  | "employees"
  | "attendance-client"
  | "certificates"
  | "history"
  | "notifications"
  | "ticket"
  | "profile"
  | "admin-courses"
  | "admin-clients"
  | "admin-teachers"
  | "admin-import"
  | "admin-attendance"
  | "admin-export"
  | "admin-smtp"
  | "admin-audit"
  | "admin-status";

type GuideSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  intro: string;
  paragraphs: string[];
  bullets: string[];
  note?: string;
  mockupKind: MockupKind;
  searchBlob: string;
};

type GuideSectionInput = Omit<GuideSection, "searchBlob">;

type GuidePageClientProps = {
  role: GuideRole;
  userName?: string | null;
};

function createSection(section: GuideSectionInput): GuideSection {
  const searchBlob = [
    section.title,
    section.intro,
    section.paragraphs.join(" "),
    section.bullets.join(" "),
    section.note ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return {
    ...section,
    searchBlob,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const normalizedQuery = query.trim();
  const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === normalizedQuery.toLowerCase()) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-amber-200 px-0.5 text-amber-950"
        >
          {part}
        </mark>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function MockupCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 text-[11px] text-gray-500">{title}</span>
      </div>
      <div className="max-w-full overflow-x-auto bg-gray-50 p-4 text-xs text-gray-700 sm:p-5 sm:text-sm">
        {children}
      </div>
    </div>
  );
}

function renderMockup(kind: MockupKind): ReactNode {
  switch (kind) {
    case "login":
      return (
        <MockupCard title="Accesso al portale">
          <div className="mx-auto max-w-md space-y-3">
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-400">
              Email aziendale
            </div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-400">
              Password
            </div>
            <button className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-white">
              Accedi
            </button>
          </div>
        </MockupCard>
      );
    case "dashboard":
      return (
        <MockupCard title="Dashboard cliente">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Corsi Attivi", "4"],
              ["Dipendenti", "39"],
              ["Attestati", "24"],
              ["Ticket Aperti", "2"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-white p-3">
                <p className="text-[11px] text-gray-500">{label}</p>
                <p className="mt-1 text-lg font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    case "courses":
      return (
        <MockupCard title="Elenco corsi ed edizioni">
          <div className="space-y-3">
            <div className="rounded-lg border bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Aggiornamento Antincendio - Ed. #2</p>
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  Anagrafiche da compilare
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Periodo: 10/04/2026 - 12/04/2026 · Deadline anagrafiche: 05/04/2026
              </p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Formazione Generale - Ed. #5</p>
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                  In corso
                </span>
              </div>
            </div>
          </div>
        </MockupCard>
      );
    case "spreadsheet":
      return (
        <MockupCard title="Spreadsheet anagrafiche">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium">Nome*</th>
                <th className="px-3 py-2 font-medium">Cognome*</th>
                <th className="px-3 py-2 font-medium">Codice Fiscale*</th>
                <th className="px-3 py-2 font-medium">Email*</th>
                <th className="px-3 py-2 font-medium">Provincia*</th>
                <th className="px-3 py-2 font-medium">Regione*</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-white">
                <td className="px-3 py-2">Giulia</td>
                <td className="px-3 py-2">Rossi</td>
                <td className="px-3 py-2 font-mono text-[11px]">RSSGLI90A41H501Y</td>
                <td className="px-3 py-2">giulia@azienda.it</td>
                <td className="px-3 py-2">CT</td>
                <td className="px-3 py-2">Sicilia</td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2">Marco</td>
                <td className="px-3 py-2">Bianchi</td>
                <td className="bg-red-50 px-3 py-2 text-red-600">CF non coerente</td>
                <td className="px-3 py-2">marco@azienda.it</td>
                <td className="px-3 py-2">MI</td>
                <td className="px-3 py-2">Lombardia</td>
              </tr>
            </tbody>
          </table>
        </MockupCard>
      );
    case "employees":
      return (
        <MockupCard title="Anagrafica dipendenti">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Cognome</th>
                <th className="px-3 py-2 font-medium">Codice Fiscale</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-white">
                <td className="px-3 py-2">Elena</td>
                <td className="px-3 py-2">Conti</td>
                <td className="px-3 py-2 font-mono text-[11px]">CNTLNE88C51F205R</td>
                <td className="px-3 py-2">elena@azienda.it</td>
                <td className="px-3 py-2 text-blue-700">Dettaglio</td>
              </tr>
            </tbody>
          </table>
        </MockupCard>
      );
    case "attendance-client":
      return (
        <MockupCard title="Presenze e ore">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium">Dipendente</th>
                <th className="px-3 py-2 font-medium">Ore frequentate</th>
                <th className="px-3 py-2 font-medium">% ore</th>
                <th className="px-3 py-2 font-medium">Stato soglia</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-white">
                <td className="px-3 py-2">Elena Conti</td>
                <td className="px-3 py-2">28/32h</td>
                <td className="px-3 py-2">87.5%</td>
                <td className="px-3 py-2 text-emerald-700">Raggiunta</td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2">Luca Neri</td>
                <td className="px-3 py-2">18/32h</td>
                <td className="px-3 py-2">56.2%</td>
                <td className="px-3 py-2 text-red-700">Sotto soglia</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Presente</span>
            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">Parziale</span>
            <span className="rounded bg-red-100 px-2 py-1 text-red-700">Assente</span>
            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Assente giustificato</span>
          </div>
        </MockupCard>
      );
    case "certificates":
      return (
        <MockupCard title="Attestati e certificazioni">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <span>Formazione Generale - Elena Conti</span>
              <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Valido</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <span>Primo Soccorso - Marco Verdi</span>
              <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">In scadenza</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <span>Antincendio - Luca Neri</span>
              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Scaduto</span>
            </div>
          </div>
        </MockupCard>
      );
    case "history":
      return (
        <MockupCard title="Storico formazione">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["Edizioni completate", "18"],
              ["Partecipanti formati", "96"],
              ["Attestati emessi", "142"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border bg-white p-3">
                <p className="text-[11px] text-gray-500">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    case "notifications":
      return (
        <MockupCard title="Centro notifiche">
          <div className="space-y-2">
            <div className="rounded-md border bg-white px-3 py-2">
              Nuova edizione assegnata: Aggiornamento RSPP
            </div>
            <div className="rounded-md border bg-white px-3 py-2">
              Attestati disponibili per il download
            </div>
            <div className="rounded-md border bg-white px-3 py-2">
              Risposta ricevuta su ticket #TK-304
            </div>
          </div>
        </MockupCard>
      );
    case "ticket":
      return (
        <MockupCard title="Supporto e ticket">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Oggetto ticket</div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Categoria</div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Descrizione</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Aperto</span>
              <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">In lavorazione</span>
              <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Chiuso</span>
            </div>
          </div>
        </MockupCard>
      );
    case "profile":
      return (
        <MockupCard title="Profilo utente">
          <div className="mx-auto max-w-md space-y-3">
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Password attuale</div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Nuova password</div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Conferma nuova password</div>
            <button className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-white">
              Salva modifiche
            </button>
          </div>
        </MockupCard>
      );
    case "admin-courses":
      return (
        <MockupCard title="Creazione corso/edizione">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Titolo corso</div>
              <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Cliente</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Data inizio</div>
              <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Data fine</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-slate-100 px-2 py-1">Draft</span>
              <span className="rounded bg-blue-100 px-2 py-1">Pubblicato</span>
              <span className="rounded bg-emerald-100 px-2 py-1">In corso</span>
              <span className="rounded bg-zinc-200 px-2 py-1">Concluso</span>
            </div>
          </div>
        </MockupCard>
      );
    case "admin-clients":
      return (
        <MockupCard title="Gestione clienti">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Utente</th>
                <th className="px-3 py-2 font-medium">Dipendenti</th>
                <th className="px-3 py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-white">
                <td className="px-3 py-2">Accademia Eraclitea</td>
                <td className="px-3 py-2">admin@cliente.it</td>
                <td className="px-3 py-2">45</td>
                <td className="px-3 py-2 text-emerald-700">Attivo</td>
              </tr>
            </tbody>
          </table>
        </MockupCard>
      );
    case "admin-teachers":
      return (
        <MockupCard title="Docenti e disponibilità">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-gray-500">Calendario disponibilità</p>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                {["L", "M", "M", "G", "V", "S", "D"].map((day, idx) => (
                  <span key={`${day}-${idx}`} className="font-semibold text-gray-500">
                    {day}
                  </span>
                ))}
                {Array.from({ length: 14 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "rounded px-1 py-1",
                      idx % 5 === 0
                        ? "bg-red-100 text-red-700"
                        : idx % 3 === 0
                          ? "bg-gray-200 text-gray-700"
                          : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {idx + 1}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-gray-500">Aree e assegnazioni</p>
              <p>Alfonso Signorini · Sicurezza · CT</p>
              <p>Maria Verdi · Compliance · MI</p>
            </div>
          </div>
        </MockupCard>
      );
    case "admin-import":
      return (
        <MockupCard title="Import attestati">
          <ol className="space-y-2">
            <li className="rounded-md border bg-white p-3">1. Carica PDF singolo o archivio massivo</li>
            <li className="rounded-md border bg-white p-3">
              2. Parsing automatico codice fiscale dal nome file
            </li>
            <li className="rounded-md border bg-white p-3">
              3. Verifica matching e conferma importazione
            </li>
          </ol>
        </MockupCard>
      );
    case "admin-attendance":
      return (
        <MockupCard title="Matrice presenze admin">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium">Dipendente</th>
                <th className="px-3 py-2 font-medium">Lez. 1</th>
                <th className="px-3 py-2 font-medium">Lez. 2</th>
                <th className="px-3 py-2 font-medium">Riepilogo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-white">
                <td className="px-3 py-2">Elena Conti</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">✓ 4h</span>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">✓ 2.5h</span>
                </td>
                <td className="px-3 py-2">6.5/8h (81.2%)</td>
              </tr>
            </tbody>
          </table>
        </MockupCard>
      );
    case "admin-export":
      return (
        <MockupCard title="Export dati">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Tipo export: Dipendenti</div>
              <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Formato: CSV</div>
            </div>
            <div className="rounded-lg border bg-white p-3 text-xs text-gray-600">
              Tipi disponibili: Corsi, Clienti, Dipendenti, Attestati, Iscrizioni, Edizioni, Aree corsi, Ticket, Docenti
            </div>
          </div>
        </MockupCard>
      );
    case "admin-smtp":
      return (
        <MockupCard title="Configurazione SMTP">
          <div className="space-y-3">
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Host SMTP</div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Porta / Sicurezza</div>
            <div className="rounded-lg border bg-white px-3 py-2.5 text-gray-500">Utente / Password</div>
            <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
              Invia email di test
            </button>
          </div>
        </MockupCard>
      );
    case "admin-audit":
      return (
        <MockupCard title="Audit log">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Utente</th>
                <th className="px-3 py-2 font-medium">Azione</th>
                <th className="px-3 py-2 font-medium">Dettaglio</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-white">
                <td className="px-3 py-2">04/03/2026 09:24</td>
                <td className="px-3 py-2">admin@enteformazione.it</td>
                <td className="px-3 py-2">UPDATE_EMPLOYEE</td>
                <td className="px-3 py-2">Modificato codice fiscale dipendente</td>
              </tr>
            </tbody>
          </table>
        </MockupCard>
      );
    case "admin-status":
      return (
        <MockupCard title="Status sistema">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["API", "Operativo", "text-emerald-700 bg-emerald-100"],
              ["Database", "Operativo", "text-emerald-700 bg-emerald-100"],
              ["Queue Email", "Warning", "text-amber-700 bg-amber-100"],
            ].map(([service, status, className]) => (
              <div key={service} className="rounded-lg border bg-white p-3">
                <p className="text-xs text-gray-500">{service}</p>
                <span className={cn("mt-1 inline-flex rounded px-2 py-1 text-xs", className)}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    default:
      return null;
  }
}

function getBaseSections(role: GuideRole): GuideSection[] {
  const adminMode = role === "ADMIN";

  return [
    createSection({
      id: "accesso",
      title: "Accesso al Portale",
      icon: LogIn,
      intro:
        "Accedi con le credenziali ricevute via email. Il portale richiede password sicura e supporta il recupero credenziali.",
      paragraphs: [
        "Al primo accesso, il sistema può richiedere il cambio password obbligatorio per motivi di sicurezza.",
        "In caso di password dimenticata, usa la funzione di recupero per ricevere il link di reset.",
      ],
      bullets: [
        "Inserisci email e password nella pagina di login.",
        "Se richiesto, aggiorna la password prima di proseguire.",
        "Usa Recupera password se non ricordi le credenziali.",
      ],
      note: "Mantieni sempre aggiornata la password e non condividerla con terzi.",
      mockupKind: "login",
    }),
    createSection({
      id: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      intro:
        "La dashboard mostra KPI principali, prossime attività, notifiche recenti e azioni rapide per accelerare il lavoro quotidiano.",
      paragraphs: [
        adminMode
          ? "Come admin visualizzi un riepilogo operativo trasversale utile per monitorare corsi, dipendenti, attestati e supporto."
          : "Come client visualizzi lo stato dei tuoi corsi attivi, dipendenti registrati, attestati disponibili e ticket aperti.",
      ],
      bullets: [
        "Controlla i contatori in alto per una vista immediata.",
        "Apri le azioni rapide per raggiungere subito le aree più usate.",
        "Consulta notifiche e scadenze per evitare ritardi operativi.",
      ],
      mockupKind: "dashboard",
    }),
    createSection({
      id: "gestione-corsi",
      title: "Gestione Corsi",
      icon: BookOpen,
      intro:
        "Dalla sezione corsi puoi aprire ogni edizione, consultarne stato e scadenze, e accedere alle tab operative collegate.",
      paragraphs: [
        adminMode
          ? "L'admin usa questa vista per supervisionare avanzamento, compilazione anagrafiche, presenze e attestati delle edizioni."
          : "Il client usa questa vista per seguire le edizioni assegnate e rispettare le deadline operative.",
      ],
      bullets: [
        "Apri il dettaglio edizione per vedere Info, Lezioni, Anagrafiche, Presenze, Attestati.",
        "Verifica sempre lo stato (Pubblicata, In corso, Conclusa).",
        "Monitora la deadline anagrafiche prima della data di blocco.",
      ],
      mockupKind: "courses",
    }),
    createSection({
      id: "anagrafiche",
      title: "Compilazione Anagrafiche (SpreadsheetEditor)",
      icon: FileSpreadsheet,
      intro:
        "Le anagrafiche vengono compilate in un foglio stile Excel integrato nel portale con controlli automatici su campi obbligatori e coerenza dati.",
      paragraphs: [
        "Le celle non valide vengono evidenziate in rosso per correzione immediata.",
        "La validazione include anche controlli sul codice fiscale rispetto ai dati anagrafici inseriti.",
      ],
      bullets: [
        "Compila Nome, Cognome, Codice Fiscale, Data nascita, Comune nascita, Email, Comune residenza, CAP, Provincia, Regione.",
        "Controlla eventuali errori evidenziati prima di inviare.",
        "Salva frequentemente per evitare perdita di modifiche.",
      ],
      note: "Le righe incomplete o incoerenti bloccano l'invio definitivo delle anagrafiche.",
      mockupKind: "spreadsheet",
    }),
    createSection({
      id: "dipendenti",
      title: "Gestione Dipendenti",
      icon: Users,
      intro:
        "La sezione dipendenti centralizza anagrafica, contatti e storico formativo. È possibile aggiungere nuovi record o modificare quelli esistenti.",
      paragraphs: [
        "Il codice fiscale è validato per formato, coerenza anagrafica e possibili duplicati sul cliente.",
      ],
      bullets: [
        "Usa la ricerca per nome, cognome, CF o email.",
        "Apri il dettaglio dipendente per aggiornare i dati completi.",
        "Verifica sempre i messaggi di validazione prima del salvataggio.",
      ],
      mockupKind: "employees",
    }),
    createSection({
      id: "presenze-ore",
      title: "Presenze e Ore",
      icon: ClipboardCheck,
      intro:
        "Le presenze sono tracciate per lezione con supporto ore frequentate, ore parziali e calcolo percentuale sul totale edizione.",
      paragraphs: [
        adminMode
          ? "L'admin può registrare e modificare stati, ore e note direttamente nella matrice presenze."
          : "Il client consulta in sola lettura lo stato presenze, il totale ore e il raggiungimento della soglia minima.",
      ],
      bullets: adminMode
        ? [
            "Click rapido: presente/assente.",
            "Opzioni avanzate: assente giustificato, ore parziali, nota.",
            "Controlla il riepilogo ore e la soglia minima configurata sull'edizione.",
          ]
        : [
            "Consulta ore frequentate, ore totali e percentuale.",
            "Usa la legenda colori per interpretare rapidamente gli stati.",
            "Verifica il raggiungimento della presenza minima richiesta.",
          ],
      note: "La presenza minima può essere impostata in percentuale, numero lezioni o ore.",
      mockupKind: "attendance-client",
    }),
    createSection({
      id: "attestati",
      title: "Attestati e Certificazioni",
      icon: Award,
      intro:
        "Gli attestati sono consultabili e scaricabili in PDF con indicatori di validità, prossima scadenza e stato complessivo.",
      paragraphs: [
        adminMode
          ? "Come admin puoi anche caricare attestati, gestire import massivi e verificare dipendenti non idonei per soglia presenze."
          : "Come client puoi scaricare rapidamente gli attestati disponibili e filtrare l'archivio per stato o corso.",
      ],
      bullets: [
        "Filtra per corso, anno e stato attestato.",
        "Scarica il singolo PDF o pacchetti multipli quando disponibili.",
        "Controlla i badge colore: valido, in scadenza, scaduto.",
      ],
      mockupKind: "certificates",
    }),
    createSection({
      id: "storico",
      title: "Storico Formazione",
      icon: History,
      intro:
        "Lo storico raccoglie edizioni concluse, partecipazioni e certificazioni emesse per analisi retrospettive e audit interni.",
      paragraphs: [
        "I filtri temporali aiutano a isolare rapidamente un periodo, un corso o una categoria formativa specifica.",
      ],
      bullets: [
        "Consulta KPI storici per anno.",
        "Apri il dettaglio edizione per vedere partecipanti e attestati rilasciati.",
        "Usa i filtri per trovare eventi formativi specifici.",
      ],
      mockupKind: "history",
    }),
    createSection({
      id: "notifiche",
      title: "Notifiche",
      icon: Bell,
      intro:
        "Le notifiche informano su nuove edizioni, scadenze operative, disponibilità attestati e aggiornamenti ticket.",
      paragraphs: [
        "La campanella mostra il conteggio non letto e la lista completa è disponibile nella pagina notifiche.",
      ],
      bullets: [
        "Apri una notifica per raggiungere direttamente la risorsa collegata.",
        "Monitora le notifiche critiche di scadenza.",
        "Segna come lette quelle già gestite.",
      ],
      mockupKind: "notifications",
    }),
    createSection({
      id: "supporto-ticket",
      title: "Supporto e Ticket",
      icon: LifeBuoy,
      intro:
        "Per richieste operative o tecniche, apri un ticket indicando categoria, descrizione e allegati. Lo stato evolverà fino alla chiusura.",
      paragraphs: [
        "Ogni ticket mantiene cronologia messaggi per facilitare il tracciamento della richiesta.",
      ],
      bullets: [
        "Apri un nuovo ticket con oggetto chiaro.",
        "Aggiungi allegati utili alla risoluzione.",
        "Segui lo stato: Aperto, In lavorazione, Chiuso.",
      ],
      mockupKind: "ticket",
    }),
    createSection({
      id: "profilo",
      title: "Profilo",
      icon: UserCircle,
      intro:
        "Nel profilo puoi aggiornare i tuoi dati utente, modificare la password e verificare le informazioni dell'account.",
      paragraphs: [
        "Il cambio password periodico è consigliato per mantenere alto il livello di sicurezza dell'accesso.",
      ],
      bullets: [
        "Aggiorna i dati personali quando necessario.",
        "Imposta password robuste e uniche.",
        "Conferma le modifiche per mantenerle attive in sessione.",
      ],
      mockupKind: "profile",
    }),
  ];
}

function getAdminExtraSections(): GuideSection[] {
  return [
    createSection({
      id: "admin-corsi",
      title: "Gestione Corsi (Admin)",
      icon: BookOpen,
      intro:
        "L'admin crea corsi, edizioni e configurazioni operative: date, visibilità clienti, soglie presenza minima e pubblicazione.",
      paragraphs: [
        "La pubblicazione controlla quando l'edizione diventa visibile al cliente.",
      ],
      bullets: [
        "Crea corso e relativa area formativa.",
        "Apri una nuova edizione con date e parametri.",
        "Passa lo stato da Draft a Pubblicato quando pronto.",
      ],
      mockupKind: "admin-courses",
    }),
    createSection({
      id: "admin-clienti",
      title: "Gestione Clienti",
      icon: Building2,
      intro:
        "Da qui gestisci anagrafica clienti, utenti associati, branding e stato attivo/disattivo dell'account.",
      paragraphs: [
        "La sezione include funzioni di reset password e controllo relazioni con dipendenti/corsi.",
      ],
      bullets: [
        "Crea nuovi clienti con account dedicato.",
        "Aggiorna logo e impostazioni di branding.",
        "Verifica vincoli prima di eliminazioni definitive.",
      ],
      mockupKind: "admin-clients",
    }),
    createSection({
      id: "admin-docenti",
      title: "Gestione Docenti",
      icon: GraduationCap,
      intro:
        "La gestione docenti include anagrafica, aree di competenza, provincia/regione, calendario disponibilità e assegnazione lezioni.",
      paragraphs: [
        "I docenti non hanno login: sono gestiti dall'admin come risorsa operativa.",
      ],
      bullets: [
        "Compila scheda docente completa e carica CV.",
        "Verifica indisponibilità e conflitti su calendario.",
        "Assegna i docenti alle lezioni dell'edizione.",
      ],
      mockupKind: "admin-teachers",
    }),
    createSection({
      id: "import-attestati",
      title: "Import Attestati",
      icon: FileUp,
      intro:
        "L'importazione supporta file singoli e massivi con parsing automatico del codice fiscale e matching dipendente.",
      paragraphs: [
        "Un wizard guidato consente di validare i match prima della conferma finale.",
      ],
      bullets: [
        "Carica i documenti PDF.",
        "Controlla risultati di parsing e anomalie.",
        "Conferma import e verifica disponibilità in archivio.",
      ],
      mockupKind: "admin-import",
    }),
    createSection({
      id: "registrazione-presenze",
      title: "Registrazione Presenze (Admin)",
      icon: ClipboardList,
      intro:
        "La matrice presenze consente registrazione veloce, opzioni avanzate e calcolo immediato del riepilogo ore/soglia.",
      paragraphs: [
        "Le modifiche restano locali finché non premi Salva modifiche.",
      ],
      bullets: [
        "Click singolo per toggle presente/assente.",
        "Click destro per assente giustificato, ore parziali e nota.",
        "Usa i comandi di colonna per segnare tutti presenti/assenti.",
      ],
      mockupKind: "admin-attendance",
    }),
    createSection({
      id: "export-dati",
      title: "Export Dati",
      icon: Download,
      intro:
        "L'area export permette di scaricare dataset in CSV/Excel con anteprima, colonne dedicate e filtri per tipo.",
      paragraphs: [
        "I formati includono dipendenti, corsi, attestati, iscrizioni, edizioni, aree corsi, ticket e docenti.",
      ],
      bullets: [
        "Seleziona il tipo di export.",
        "Controlla l'anteprima prima dello scaricamento.",
        "Esporta in formato compatibile con strumenti esterni.",
      ],
      mockupKind: "admin-export",
    }),
    createSection({
      id: "smtp",
      title: "Configurazione SMTP",
      icon: Mail,
      intro:
        "Configura account SMTP per invio email applicative e verifica il corretto funzionamento con invio di test.",
      paragraphs: [
        "I parametri possono essere cifrati e aggiornati senza downtime applicativo.",
      ],
      bullets: [
        "Configura host, porta, sicurezza e credenziali.",
        "Esegui invio test e verifica log.",
        "Rimuovi account obsoleti con conferma.",
      ],
      mockupKind: "admin-smtp",
    }),
    createSection({
      id: "audit-log",
      title: "Audit Log",
      icon: ScrollText,
      intro:
        "L'audit log traccia le operazioni rilevanti con utente, azione e timestamp per controllo interno e conformità.",
      paragraphs: [
        "I filtri aiutano a isolare azioni per utente, modulo e intervallo temporale.",
      ],
      bullets: [
        "Filtra per azione o utente.",
        "Analizza i dettagli delle modifiche critiche.",
        "Usa i log per troubleshooting e verifica procedure.",
      ],
      mockupKind: "admin-audit",
    }),
    createSection({
      id: "status-sistema",
      title: "Status Sistema",
      icon: Activity,
      intro:
        "La pagina status offre una vista rapida dello stato servizi applicativi e componenti infrastrutturali.",
      paragraphs: [
        "È utile per individuare rapidamente degradazioni o interruzioni di servizio.",
      ],
      bullets: [
        "Controlla stato API e database.",
        "Verifica code e servizi email.",
        "Intervieni in caso di warning o errori persistenti.",
      ],
      mockupKind: "admin-status",
    }),
  ];
}

function getGuideSections(role: GuideRole): GuideSection[] {
  const baseSections = getBaseSections(role);
  if (role === "CLIENT") return baseSections;
  return [...baseSections, ...getAdminExtraSections()];
}

export default function GuidePageClient({ role, userName }: GuidePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const normalizedQuery = debouncedSearch.trim().toLowerCase();
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const allSections = useMemo(() => getGuideSections(role), [role]);

  const visibleSections = useMemo(() => {
    if (!normalizedQuery) return allSections;
    return allSections.filter((section) => section.searchBlob.includes(normalizedQuery));
  }, [allSections, normalizedQuery]);

  const visibleSectionIdsKey = useMemo(
    () => visibleSections.map((section) => section.id).join("|"),
    [visibleSections]
  );

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (visibleSections.length === 0) {
      setOpenSections(new Set());
      return;
    }

    if (normalizedQuery) {
      setOpenSections(new Set(visibleSections.map((section) => section.id)));
      return;
    }

    setOpenSections(new Set([visibleSections[0].id]));
  }, [isMobile, normalizedQuery, visibleSectionIdsKey, visibleSections]);

  const roleDescription =
    role === "ADMIN"
      ? "Guida operativa completa per amministratori: gestione formazione, anagrafiche, docenti, presenze, attestati e strumenti di controllo."
      : "Guida operativa completa per clienti: accesso, corsi, anagrafiche, dipendenti, presenze, attestati, notifiche e supporto.";

  const toggleSection = (sectionId: string) => {
    if (!isMobile) return;
    setOpenSections((current) => {
      const updated = new Set(current);
      if (updated.has(sectionId)) {
        updated.delete(sectionId);
      } else {
        updated.add(sectionId);
      }
      return updated;
    });
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (isMobile) {
      setOpenSections((current) => {
        const updated = new Set(current);
        updated.add(sectionId);
        return updated;
      });
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <BookOpen className="h-6 w-6 text-amber-500" />
          Guida al Portale
        </h1>
        <p className="text-sm text-muted-foreground">{roleDescription}</p>
        {userName ? (
          <p className="text-xs text-muted-foreground">
            Sessione attiva: <span className="font-medium">{userName}</span>
          </p>
        ) : null}
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Cerca nella guida..."
          className="w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm outline-none ring-amber-300 transition focus:ring-2"
        />
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Indice
        </h2>
        {visibleSections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna sezione disponibile per la ricerca corrente.
          </p>
        ) : (
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleSections.map((section, index) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="inline-flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm transition hover:bg-amber-50"
                >
                  <span className="shrink-0 text-xs font-semibold text-amber-600">{index + 1}.</span>
                  <section.icon className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="min-w-0 break-words">
                    {highlightText(section.title, normalizedQuery)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {visibleSections.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Nessun risultato per &quot;{searchQuery.trim()}&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSections.map((section) => {
            const isOpen = !isMobile || openSections.has(section.id);
            return (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-24 overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-4 py-4 text-left sm:px-6",
                    isMobile ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="rounded-lg bg-amber-100 p-2 text-amber-700">
                      <section.icon className="h-4 w-4" />
                    </span>
                    <span className="text-base font-semibold sm:text-lg">
                      {highlightText(section.title, normalizedQuery)}
                    </span>
                  </span>
                  {isMobile ? (
                    isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )
                  ) : null}
                </button>

                <div
                  className={cn(
                    "border-t border-gray-200 px-4 py-4 sm:px-6",
                    isMobile
                      ? "overflow-hidden transition-all duration-300"
                      : "",
                    isMobile && !isOpen ? "max-h-0 border-t-0 py-0 opacity-0" : "",
                    isMobile && isOpen ? "max-h-[3000px] opacity-100" : ""
                  )}
                >
                  <p className="text-sm text-muted-foreground">
                    {highlightText(section.intro, normalizedQuery)}
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{highlightText(paragraph, normalizedQuery)}</p>
                    ))}
                  </div>

                  <ul className="mt-4 space-y-2 text-sm">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{highlightText(bullet, normalizedQuery)}</span>
                      </li>
                    ))}
                  </ul>

                  {section.note ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{highlightText(section.note, normalizedQuery)}</span>
                      </p>
                    </div>
                  ) : null}

                  {renderMockup(section.mockupKind)}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <button
        type="button"
        aria-label="Torna su"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-all hover:bg-amber-600",
          showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
