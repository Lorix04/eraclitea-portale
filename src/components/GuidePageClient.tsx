"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUp,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  FolderOpen,
  Globe,
  GraduationCap,
  History,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  Mail,
  Search,
  ScrollText,
  Shield,
  UserCircle,
  Users,
  UserCog,
  UsersRound,
  Settings,
  Sparkles,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

type GuideRole = "ADMIN" | "CLIENT" | "TEACHER";

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
  | "admin-status"
  | "admin-roles"
  | "admin-referents"
  | "admin-materials"
  | "admin-cv"
  | "admin-impersonate"
  | "admin-email-teachers"
  | "admin-area-corsi"
  | "admin-ticket-teachers"
  | "client-materials"
  | "teacher-dashboard"
  | "teacher-lessons"
  | "teacher-attendance"
  | "teacher-materials"
  | "teacher-availability"
  | "teacher-documents"
  | "teacher-cv"
  | "teacher-cv-dpr445"
  | "teacher-ticket"
  | "teacher-profile"
  | "admin-custom-fields"
  | "admin-import-export"
  | "admin-cv-dpr445"
  | "admin-amministratori"
  | "admin-integrity"
  | "admin-ai";

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
                <td className="px-3 py-2">giulia@esempio.it</td>
                <td className="px-3 py-2">CT</td>
                <td className="px-3 py-2">Sicilia</td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2">Marco</td>
                <td className="px-3 py-2">Bianchi</td>
                <td className="bg-red-50 px-3 py-2 text-red-600">CF non coerente</td>
                <td className="px-3 py-2">marco@esempio.it</td>
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
                <td className="px-3 py-2">elena@esempio.it</td>
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
    case "client-materials":
      return (
        <MockupCard title="Materiale didattico">
          <div className="space-y-2">
            {[["Slide Modulo 1 — Antincendio.pdf", "2.3 MB", "Slide"], ["Esercizio Pratico.pdf", "1.1 MB", "Esercitazioni"], ["Normativa DM 2021.pdf", "0.8 MB", "Normativa"]].map(([name, size, cat]) => (
              <div key={name} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                <div><p className="text-sm font-medium">{name}</p><p className="text-[10px] text-gray-400">{cat} · {size}</p></div>
                <span className="text-blue-600 text-xs">Scarica</span>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    case "admin-roles":
      return (
        <MockupCard title="Editor permessi ruolo">
          <div className="space-y-1.5">
            {[["Dashboard", "1/1"], ["Corsi", "3/4"], ["Clienti", "2/6"], ["Docenti", "3/7"]].map(([area, count]) => (
              <div key={area} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                <span className="font-medium">{area}</span>
                <span className="text-xs text-gray-500">{count} permessi</span>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    case "admin-referents":
      return (
        <MockupCard title="Referenti edizione">
          <div className="space-y-2">
            <div className="rounded-md border bg-white p-3"><p className="font-medium">Maria Rossi</p><p className="text-xs text-gray-500">Segreteria · Assegnato il 23/03/2026</p></div>
            <div className="rounded-md border bg-white p-3"><p className="font-medium">Luca Bianchi</p><p className="text-xs text-gray-500">Gestione Formazione · Assegnato il 23/03/2026</p></div>
          </div>
        </MockupCard>
      );
    case "admin-materials":
      return (
        <MockupCard title="Materiali corso + edizione">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <div><p className="font-medium">Slide Modulo 1</p><p className="text-[10px] text-gray-400">Slide · 2.3 MB</p></div>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Dal corso</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2">
              <div><p className="font-medium">Dispense Aggiuntive</p><p className="text-[10px] text-amber-600">In attesa di approvazione</p></div>
              <div className="flex gap-1 text-xs"><span className="text-emerald-600">Approva</span><span className="text-red-600">Rifiuta</span></div>
            </div>
          </div>
        </MockupCard>
      );
    case "admin-cv":
      return (
        <MockupCard title="CV strutturato docente">
          <div className="space-y-2">
            {[["Esperienze lavorative", "3"], ["Formazione", "2"], ["Certificazioni", "4"], ["Esperienza docente", "10"]].map(([s, c]) => (
              <div key={s} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                <span>{s}</span><span className="text-lg font-semibold">{c}</span>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    case "admin-impersonate":
      return (
        <MockupCard title="Impersonazione docente">
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Stai visualizzando come <strong>Alfonso Signorini</strong> (Docente) — <span className="underline">Torna all&apos;admin</span>
          </div>
        </MockupCard>
      );
    case "admin-email-teachers":
      return (
        <MockupCard title="Email automatiche docenti">
          <div className="space-y-2">
            {[["Lezione assegnata", "Antincendio — 02/03/2026"], ["Lezione rimossa", "Primo Soccorso — 10/03/2026"], ["Lezione modificata", "RSPP — nuova data"]].map(([tipo, det]) => (
              <div key={tipo} className="rounded-md border bg-white px-3 py-2"><p className="font-medium text-xs">{tipo}</p><p className="text-[10px] text-gray-500">{det}</p></div>
            ))}
          </div>
        </MockupCard>
      );
    case "admin-area-corsi":
      return (
        <MockupCard title="Aree corsi">
          <div className="space-y-2">
            {[["Sicurezza sul lavoro", "12 corsi"], ["Compliance", "5 corsi"], ["Soft Skills", "3 corsi"]].map(([n, c]) => (
              <div key={n} className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><span className="font-medium">{n}</span><span className="text-xs text-gray-500">{c}</span></div>
            ))}
          </div>
        </MockupCard>
      );
    case "admin-ticket-teachers":
      return (
        <MockupCard title="Ticket docenti e clienti">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <div><p className="font-medium">Problema calendario</p><p className="text-[10px] text-gray-400">Alfonso Signorini</p></div>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Docente</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <div><p className="font-medium">Attestato mancante</p><p className="text-[10px] text-gray-400">Accademia Eraclitea</p></div>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Cliente</span>
            </div>
          </div>
        </MockupCard>
      );
    case "teacher-dashboard":
      return (
        <MockupCard title="Dashboard docente">
          <div className="grid gap-2 sm:grid-cols-4">
            {[["Prossime lezioni", "3"], ["Totale lezioni", "24"], ["Ore totali", "48h"], ["Corsi attivi", "5"]].map(([l, v]) => (
              <div key={l} className="rounded-lg border bg-white p-3"><p className="text-[11px] text-gray-500">{l}</p><p className="mt-1 text-lg font-semibold text-gray-800">{v}</p></div>
            ))}
          </div>
        </MockupCard>
      );
    case "teacher-lessons":
      return (
        <MockupCard title="Le mie lezioni">
          <div className="space-y-2">
            <div className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between"><p className="font-semibold">Antincendio livello 3</p><span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Presenze da registrare</span></div>
              <p className="mt-1 text-xs text-gray-500">02/03/2026 · 09:00-13:00 · 4h · Accademia Eraclitea · Catania</p>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between"><p className="font-semibold">RSPP Modulo C</p><span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Presenze registrate</span></div>
              <p className="mt-1 text-xs text-gray-500">10/03/2026 · 14:00-18:00 · 4h · Studio Rossi · Roma</p>
            </div>
          </div>
        </MockupCard>
      );
    case "teacher-attendance":
      return (
        <MockupCard title="Registrazione presenze">
          <table className="w-full min-w-[500px] border-collapse">
            <thead><tr className="border-b bg-gray-100 text-left"><th className="px-3 py-2 font-medium">Partecipante</th><th className="px-3 py-2 font-medium">Stato</th><th className="px-3 py-2 font-medium">Ore</th></tr></thead>
            <tbody>
              <tr className="border-b bg-white"><td className="px-3 py-2">Elena Conti</td><td className="px-3 py-2"><span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">Presente</span></td><td className="px-3 py-2">4h</td></tr>
              <tr className="bg-white"><td className="px-3 py-2">Marco Verdi</td><td className="px-3 py-2"><span className="rounded bg-red-100 px-2 py-0.5 text-red-700">Assente</span></td><td className="px-3 py-2">0h</td></tr>
            </tbody>
          </table>
        </MockupCard>
      );
    case "teacher-materials":
      return (
        <MockupCard title="Materiale lezione">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><span>Slide Modulo 1.pdf</span><span className="text-blue-600 text-xs">Scarica</span></div>
            <div className="flex items-center justify-between rounded-md border bg-amber-50 px-3 py-2"><span>Dispensa aggiuntiva.pdf</span><span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">In attesa</span></div>
          </div>
        </MockupCard>
      );
    case "teacher-availability":
      return (
        <MockupCard title="Gestione disponibilita">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (<span key={`${d}${i}`} className="font-semibold text-gray-500">{d}</span>))}
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className={cn("rounded px-1 py-1", i === 2 || i === 3 ? "bg-amber-200 text-amber-800" : i === 7 ? "bg-gray-200 text-gray-500" : "bg-white border")}>{i + 1}</span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-500">Oro = lezioni · Grigio = indisponibile</p>
        </MockupCard>
      );
    case "teacher-documents":
      return (
        <MockupCard title="Documenti docente">
          <div className="space-y-2">
            {[["Dichiarazione sostitutiva", "Firmata il 23/03/2026", "PDF"], ["Curriculum Vitae", "Caricato il 20/03/2026", "PDF"], ["Documento identita", "Caricato il 20/03/2026", "JPG"]].map(([n, d, t]) => (
              <div key={n} className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><div><p className="font-medium text-sm">{n}</p><p className="text-[10px] text-gray-400">{d} · {t}</p></div><span className="text-blue-600 text-xs">Scarica</span></div>
            ))}
          </div>
        </MockupCard>
      );
    case "teacher-cv":
      return (
        <MockupCard title="CV strutturato">
          <div className="space-y-1.5">
            {[["Esperienze lavorative", "3", true], ["Formazione", "2", true], ["Lingue", "2", false], ["Certificazioni", "4", false], ["Competenze", "5", false], ["Esperienza docente", "8", false]].map(([s, c, req]) => (
              <div key={s as string} className="flex items-center justify-between rounded-md border bg-white px-3 py-1.5">
                <span className="text-sm">{s as string}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c as string}</span>
                  {req ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-600">OK</span> : null}
                </div>
              </div>
            ))}
          </div>
        </MockupCard>
      );
    case "teacher-cv-dpr445":
      return (
        <MockupCard title="CV DPR 445/2000">
          <div className="space-y-2">
            <div className="rounded-md border-l-4 border-l-amber-400 bg-amber-50 px-3 py-2"><p className="font-medium text-sm text-amber-700">Richiesta compilazione</p><p className="text-[10px] text-gray-500">Scadenza: 30/04/2026</p></div>
            <div className="space-y-1">
              <div className="rounded-md border bg-white px-3 py-1.5 text-sm">Template PDF <span className="float-right text-blue-600 text-xs">Scarica</span></div>
              <div className="rounded-md border bg-white px-3 py-1.5 text-sm">Upload PDF <span className="float-right text-xs text-gray-400">Trascina qui</span></div>
              <div className="rounded-md border bg-white px-3 py-1.5 text-sm">Criterio formatore <span className="float-right text-xs text-emerald-600">Compilato</span></div>
              <div className="rounded-md border bg-white px-3 py-1.5 text-sm">Aree tematiche <span className="float-right text-xs text-emerald-600">A, C</span></div>
            </div>
          </div>
        </MockupCard>
      );
    case "teacher-ticket":
      return (
        <MockupCard title="Supporto docente">
          <div className="space-y-2">
            <div className="rounded-md border bg-white px-3 py-2"><p className="font-medium text-sm">Problema con calendario</p><p className="text-[10px] text-gray-400">Aperto · 22/03/2026</p></div>
            <div className="rounded-md border bg-white px-3 py-2"><p className="font-medium text-sm">Richiesta materiale</p><p className="text-[10px] text-gray-400">Chiuso · 18/03/2026</p></div>
          </div>
        </MockupCard>
      );
    case "teacher-profile":
      return (
        <MockupCard title="Profilo docente">
          <div className="mx-auto max-w-md space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-white px-3 py-2 text-gray-500 text-xs">Cognome</div>
              <div className="rounded-lg border bg-white px-3 py-2 text-gray-500 text-xs">Nome</div>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2 text-gray-500 text-xs">Email (non modificabile)</div>
            <div className="rounded-lg border bg-white px-3 py-2 text-gray-500 text-xs">Codice Fiscale</div>
          </div>
        </MockupCard>
      );
    case "admin-custom-fields":
      return (
        <MockupCard title="Campi personalizzati">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-1.5"><span className="text-sm">Settore</span><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Testo</span></div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-1.5"><span className="text-sm">Reparto</span><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Selezione</span></div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-1.5"><span className="text-sm">Data Assunzione</span><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">Data</span></div>
          </div>
        </MockupCard>
      );
    case "admin-import-export":
      return (
        <MockupCard title="Import dipendenti">
          <div className="space-y-2">
            <div className="rounded-md border-l-4 border-l-amber-400 bg-amber-50 px-3 py-2 text-xs">Formato: Personalizzato (8 campi)</div>
            <div className="rounded-md border bg-white px-3 py-1.5 text-sm">Colonna file <span className="float-right text-xs text-emerald-600">Mappato</span></div>
            <div className="rounded-md border bg-white px-3 py-1.5 text-sm">CF <span className="float-right text-xs text-emerald-600">Codice Fiscale</span></div>
          </div>
        </MockupCard>
      );
    case "admin-cv-dpr445":
      return (
        <MockupCard title="CV DPR 445 — Revisione">
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Ricevuto</span><span className="text-xs text-gray-500">15/04/2026</span></div>
            <div className="rounded-md border bg-white px-3 py-2"><p className="text-sm">Criterio: 2 — Laurea coerente</p><p className="text-xs text-gray-400">Aree: A, C · Privacy: OK</p></div>
            <div className="flex gap-2"><span className="rounded bg-emerald-100 px-3 py-1 text-xs text-emerald-700">Approva</span><span className="rounded bg-red-100 px-3 py-1 text-xs text-red-700">Rifiuta</span></div>
          </div>
        </MockupCard>
      );
    case "admin-amministratori":
      return (
        <MockupCard title="Gestione amministratori">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><div><p className="font-medium text-sm">admin@eraclitea.it</p><p className="text-[10px] text-gray-400">Super Admin</p></div><span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Attivo</span></div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><div><p className="font-medium text-sm">segreteria@eraclitea.it</p><p className="text-[10px] text-gray-400">Segreteria</p></div><span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Attivo</span></div>
          </div>
        </MockupCard>
      );
    case "admin-integrity":
      return (
        <MockupCard title="Integrita docenti">
          <div className="space-y-2">
            <div className="rounded-md border-l-4 border-l-amber-400 bg-amber-50 px-3 py-2"><p className="font-medium text-xs text-amber-700">2 problemi rilevati</p></div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><span className="text-sm">Mario Rossi</span><span className="text-xs text-amber-600">Attivo ⚠</span></div>
          </div>
        </MockupCard>
      );
    case "admin-ai":
      return (
        <MockupCard title="Integrazioni AI">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><span className="text-sm">Provider</span><span className="text-xs">OpenRouter</span></div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><span className="text-sm">Modello</span><span className="text-xs">Llama 3.3 70B</span></div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2"><span className="text-sm">Stato</span><span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">Attivo</span></div>
          </div>
        </MockupCard>
      );
    default:
      return null;
  }
}

function getBaseSections(role: GuideRole): GuideSection[] {
  const adminMode = role === "ADMIN";
  const clientOrAdmin = role === "CLIENT" || role === "ADMIN";

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
        "Se il cliente ha i campi personalizzati attivi, il foglio mostra solo CF, Nome, Cognome e le colonne custom. I campi standard aggiuntivi sono accessibili dal pulsante 'Altro'.",
      ],
      bullets: [
        "Compila i campi obbligatori: le colonne variano in base alla configurazione del cliente.",
        "Con campi personalizzati: il foglio mostra le colonne configurate dall'admin.",
        "Senza campi personalizzati: 11 colonne standard (Nome, Cognome, CF, Sesso, ecc.).",
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
        "La sezione dipendenti centralizza anagrafica, contatti e storico formativo. E possibile importare, esportare e gestire i record con supporto per campi personalizzati.",
      paragraphs: [
        "Il codice fiscale e validato per formato, coerenza anagrafica e possibili duplicati sul cliente.",
        "L'import supporta file Excel e CSV con mappatura colonne intelligente. L'export offre formato standard (21 colonne) o formato cliente (solo campi personalizzati).",
      ],
      bullets: [
        "Usa la ricerca per nome, cognome, CF o email.",
        "Importa dipendenti da file Excel/CSV con scelta formato standard o personalizzato.",
        "Esporta in Excel (.xlsx) o CSV (.csv) con scelta formato.",
        "Il dettaglio dipendente mostra i campi personalizzati in una sezione dedicata con sfondo ambra.",
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
    ...(clientOrAdmin
      ? [
          createSection({
            id: "materiali-didattici",
            title: "Materiale Didattico",
            icon: FolderOpen,
            intro:
              "Ogni edizione può avere materiali didattici scaricabili: slide, esercitazioni, documenti normativi e modelli operativi.",
            paragraphs: [
              adminMode
                ? "Come admin puoi caricare materiali a livello di corso (libreria standard) e importarli nelle edizioni. I docenti possono proporre materiali che vanno approvati."
                : "Come client puoi consultare e scaricare tutti i materiali approvati per le tue edizioni, organizzati per categoria.",
            ],
            bullets: [
              "Apri il dettaglio edizione e vai al tab Materiali.",
              "Filtra per categoria: Slide, Esercitazioni, Documenti, Normativa, Modelli.",
              "Scarica singoli file o usa il download ZIP per scaricare tutto.",
              "Usa l'anteprima inline per PDF e immagini senza scaricarli.",
            ],
            note: "I materiali sono organizzati per categoria e possono essere riordinati dall'admin.",
            mockupKind: "client-materials",
          }),
        ]
      : []),
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
    createSection({
      id: "admin-area-corsi",
      title: "Area Corsi",
      icon: Globe,
      intro: "Le aree corsi sono categorie tematiche che raggruppano corsi omogenei per ambito formativo.",
      paragraphs: [
        "Ogni area può essere associata a più corsi e utilizzata come filtro nelle liste e negli export.",
      ],
      bullets: [
        "Crea nuove aree dalla pagina dedicata.",
        "Associa i corsi alle aree durante la creazione o modifica del corso.",
        "Usa le aree per filtrare e organizzare il catalogo formativo.",
      ],
      mockupKind: "admin-area-corsi",
    }),
    createSection({
      id: "admin-materiali",
      title: "Materiale Didattico (Admin)",
      icon: FolderOpen,
      intro: "Gestisci materiali a livello di corso (libreria standard) e di edizione, con workflow di approvazione per i file proposti dai docenti.",
      paragraphs: [
        "I materiali del corso sono una libreria riutilizzabile. Da ogni edizione puoi importare materiali dal corso come copie indipendenti.",
        "I docenti possono proporre file che appaiono con stato 'In attesa'. L'admin deve approvare o rifiutare prima che diventino visibili.",
      ],
      bullets: [
        "Carica materiali nel tab Materiali del corso per la libreria standard.",
        "Nell'edizione, usa 'Importa dal corso' per copiare materiali dalla libreria.",
        "Approva o rifiuta i materiali proposti dai docenti con un click.",
        "Riordina i materiali con le frecce su/giù.",
        "Scarica tutto in ZIP per distribuzione offline.",
      ],
      note: "I materiali importati dal corso sono copie indipendenti: modifiche al corso non impattano le edizioni e viceversa.",
      mockupKind: "admin-materials",
    }),
    createSection({
      id: "admin-cv-docenti",
      title: "CV Docenti",
      icon: FileText,
      intro: "Visualizza il curriculum vitae strutturato di ogni docente con 8 sezioni, badge scadenza certificazioni e auto-sincronizzazione delle lezioni erogate.",
      paragraphs: [
        "Nel dettaglio docente, il tab CV mostra tutte le sezioni compilate dal docente durante la registrazione o dal profilo.",
        "Le esperienze come docente vengono generate automaticamente dalle lezioni assegnate nel portale, con badge 'Dal portale'.",
      ],
      bullets: [
        "Apri il tab CV nel dettaglio docente per la vista completa.",
        "Controlla i badge scadenza sulle certificazioni: verde (valido), giallo (in scadenza), rosso (scaduta).",
        "Usa 'Aggiorna esperienza portale' per sincronizzare le lezioni erogate.",
        "Scarica il CV in formato Europass PDF generato automaticamente.",
      ],
      mockupKind: "admin-cv",
    }),
    createSection({
      id: "admin-impersonazione",
      title: "Impersonazione Docente",
      icon: LogIn,
      intro: "L'admin può accedere al portale docente come se fosse il docente selezionato, per verificare dati, risolvere problemi o completare operazioni.",
      paragraphs: [
        "Un banner giallo in cima al portale indica che si sta visualizzando come un altro utente. Tutte le operazioni vengono eseguite nel contesto del docente.",
      ],
      bullets: [
        "Dalla lista docenti, clicca 'Accedi come' per un docente attivo.",
        "Naviga il portale docente vedendo dashboard, lezioni, documenti e profilo del docente.",
        "Clicca 'Torna all'admin' nel banner per tornare alla sessione admin.",
      ],
      note: "L'impersonazione funziona anche per i clienti dalla pagina Clienti.",
      mockupKind: "admin-impersonate",
    }),
    createSection({
      id: "admin-email-docenti",
      title: "Email Docenti",
      icon: Mail,
      intro: "Il portale invia automaticamente email ai docenti per eventi legati alle lezioni, inviti e notifiche operative.",
      paragraphs: [
        "Quando un docente viene assegnato, rimosso o una lezione viene modificata, riceve un'email automatica con i dettagli aggiornati.",
      ],
      bullets: [
        "Assegnazione lezione: email con corso, data, orario e luogo.",
        "Rimozione da lezione: email di notifica con dettagli della lezione rimossa.",
        "Modifica lezione: email a tutti i docenti assegnati con i nuovi dettagli.",
        "Invito registrazione: email con link per completare la registrazione al portale.",
      ],
      mockupKind: "admin-email-teachers",
    }),
    createSection({
      id: "admin-ticket-docenti",
      title: "Ticket Docenti",
      icon: LifeBuoy,
      intro: "I ticket dei docenti appaiono nella stessa pagina Ticket degli admin, con badge per distinguere il mittente.",
      paragraphs: [
        "Ogni ticket ha un badge 'Docente' o 'Cliente' per identificare rapidamente la provenienza della richiesta.",
      ],
      bullets: [
        "Filtra i ticket per tipo mittente: docenti o clienti.",
        "Rispondi ai ticket docenti come per quelli clienti.",
        "Chiudi i ticket risolti per mantenere la lista pulita.",
      ],
      mockupKind: "admin-ticket-teachers",
    }),
    createSection({
      id: "admin-referenti",
      title: "Referenti Edizione",
      icon: UsersRound,
      intro: "Assegna uno o più referenti (amministratori) a ogni edizione per definire chi è responsabile della gestione operativa.",
      paragraphs: [
        "I referenti possono avere permesso 'view-all' per vedere tutte le edizioni o 'view-own' per vedere solo le edizioni a cui sono assegnati.",
        "Le edizioni senza referenti sono visibili a tutti gli admin.",
      ],
      bullets: [
        "Apri il dettaglio edizione per assegnare i referenti nella sezione dedicata.",
        "Usa il filtro 'Le mie edizioni' nella lista edizioni per vedere solo le tue.",
        "La dashboard mostra statistiche filtrate se l'utente ha solo permesso 'view-own'.",
        "I referenti ricevono notifiche quando vengono assegnati a un'edizione.",
      ],
      mockupKind: "admin-referents",
    }),
    createSection({
      id: "admin-ruoli",
      title: "Ruoli e Permessi",
      icon: Shield,
      intro: "Gestisci i ruoli di accesso al portale admin con permessi granulari per area e azione, invito nuovi amministratori e protezione Super Admin.",
      paragraphs: [
        "Il sistema include 4 ruoli predefiniti: Super Admin (non modificabile), Segreteria, Solo Lettura e Gestione Formazione. Puoi creare ruoli personalizzati.",
        "I permessi sono organizzati per area (Corsi, Clienti, Docenti, ecc.) e azione (Visualizza, Crea, Modifica, Elimina, ecc.).",
      ],
      bullets: [
        "Crea nuovi ruoli con editor permessi: checkbox per ogni area e azione.",
        "Usa i template predefiniti per precompilare i permessi di un nuovo ruolo.",
        "Duplica un ruolo esistente per partire da una base già configurata.",
        "Invita nuovi admin: inserisci nome e email, il sistema invia un link di registrazione.",
        "La sidebar del portale nasconde automaticamente le voci per cui l'utente non ha permesso.",
      ],
      note: "Il Super Admin ha accesso completo e non può essere modificato o eliminato. Deve sempre esistere almeno un Super Admin.",
      mockupKind: "admin-roles",
    }),
    createSection({
      id: "admin-amministratori",
      title: "Gestione Amministratori",
      icon: UserCog,
      intro: "Gestisci gli account amministratore del portale: crea, modifica, sospendi, resetta password. I Super Admin sono visibili solo ad altri Super Admin.",
      paragraphs: [
        "La pagina Amministratori mostra solo gli utenti con ruolo Admin. I non-Super Admin non vedono i Super Admin nella lista.",
        "Ogni azione e protetta: non puoi modificare il tuo ruolo, sospendere te stesso o eliminare l'ultimo Super Admin.",
      ],
      bullets: [
        "Crea un nuovo amministratore con email, nome e ruolo assegnato.",
        "Modifica nome, email e ruolo admin tramite il modale di modifica rapida.",
        "Reset password: genera una nuova password temporanea e la invia via email.",
        "Sblocca account: resetta i tentativi di login falliti.",
        "Sospendi un admin per impedirgli l'accesso (reversibile con Riattiva).",
        "Elimina un admin definitivamente (richiede conferma con email).",
        "Filtra per ruolo admin (Super Admin, Segreteria, ecc.) e stato (Attivo, Sospeso, Bloccato).",
      ],
      note: "Le azioni su un Super Admin sono consentite solo ad altri Super Admin. Nessuno puo modificare il proprio ruolo o sospendere se stesso.",
      mockupKind: "admin-amministratori",
    }),
    createSection({
      id: "admin-campi-personalizzati",
      title: "Campi Personalizzati Anagrafiche",
      icon: Settings,
      intro: "Configura colonne aggiuntive nelle anagrafiche dei dipendenti, specifiche per ciascun cliente. I campi si integrano automaticamente nel foglio, nell'import e nell'export.",
      paragraphs: [
        "Dalla pagina dettaglio del cliente, attiva la sezione Campi Personalizzati. Una volta attivi, il foglio anagrafiche mostra solo CF, Nome, Cognome e le colonne custom.",
        "Ogni campo puo mappare un campo standard del dipendente (es. Email, Mansione) o essere completamente personalizzato. I dati custom vengono salvati nel campo JSON del dipendente.",
      ],
      bullets: [
        "Attiva/disattiva i campi personalizzati per ogni cliente separatamente.",
        "5 tipi di campo: Testo, Numero, Data, Selezione (dropdown), Email.",
        "Importa campi da un template Excel del cliente: il sistema riconosce automaticamente le colonne.",
        "Riordina i campi con le frecce su/giu per definire l'ordine delle colonne.",
        "I dati non vengono eliminati disattivando i campi — tornano visibili riattivandoli.",
        "Il template scaricabile riflette esattamente i campi configurati con asterisco sui campi obbligatori.",
      ],
      note: "In modalita personalizzata, solo i campi marcati come obbligatori vengono validati durante l'import. Nome, Cognome e Codice Fiscale diventano opzionali.",
      mockupKind: "admin-custom-fields",
    }),
    createSection({
      id: "admin-import-export",
      title: "Import/Export Dipendenti",
      icon: FileSpreadsheet,
      intro: "Importa ed esporta anagrafiche dipendenti in formato Excel (.xlsx) o CSV (.csv), con supporto per campi personalizzati e mappatura colonne intelligente.",
      paragraphs: [
        "L'import riconosce automaticamente le colonne del file grazie a un sistema di alias: 'CF', 'Codice Fiscale' e 'codice_fiscale' vengono tutti mappati correttamente.",
        "L'export offre due formati: Standard (21 colonne fisse) e Formato Cliente (solo le colonne personalizzate configurate).",
      ],
      bullets: [
        "Import: scegli tra formato standard (20 campi) o personalizzato (campi del cliente).",
        "Mappatura colonne: il sistema propone la corrispondenza automatica con possibilita di correzione manuale.",
        "Anteprima: visualizza i primi dati prima di confermare l'import.",
        "Export Excel (.xlsx) o CSV (.csv) con BOM UTF-8 per compatibilita accenti.",
        "Template scaricabile: genera un file con le colonne corrette per il formato scelto.",
        "I duplicati (codice fiscale gia esistente) vengono automaticamente saltati.",
      ],
      mockupKind: "admin-import-export",
    }),
    createSection({
      id: "admin-cv-dpr445",
      title: "CV DPR 445/2000",
      icon: ClipboardCheck,
      intro: "Gestisci la raccolta del Curriculum Vitae ai sensi del DPR 445/2000 per i docenti. Richiedi la compilazione, revisiona i documenti e approva o rifiuta.",
      paragraphs: [
        "Il CV DPR 445 e un documento ufficiale richiesto ai formatori in materia di sicurezza. L'admin puo richiedere la compilazione singolarmente o in massa a tutti i docenti.",
        "Il docente scarica il template PDF, lo compila, lo ricarica e compila il form digitale con criteri, aree tematiche e abilitazioni. L'admin revisiona e approva o rifiuta con motivazione.",
      ],
      bullets: [
        "Richiesta singola: dalla tab 'CV DPR 445' nel dettaglio docente.",
        "Richiesta massiva: bottone 'Richiedi CV DPR 445' nella lista docenti.",
        "Colonna 'CV 445' nella lista docenti con badge stato (Richiesto, Inviato, Approvato, Rifiutato).",
        "Azione rapida nel menu del docente: Richiedi CV / Invia reminder / Revisiona.",
        "Approvazione o rifiuto con motivazione obbligatoria.",
        "Email automatiche al docente per ogni cambio di stato.",
        "Reminder automatico via cron per scadenze imminenti.",
      ],
      note: "Il docente puo salvare una bozza e completare in un secondo momento. Dopo il rifiuto, i dati precedenti sono precompilati per facilitare la correzione.",
      mockupKind: "admin-cv-dpr445",
    }),
    createSection({
      id: "admin-integrita-docenti",
      title: "Integrita Docenti",
      icon: AlertTriangle,
      intro: "Rileva e risolvi inconsistenze nei dati dei docenti: docenti con status Attivo ma senza account utente associato.",
      paragraphs: [
        "Un docente 'attivo senza account' non puo accedere al portale ne essere impersonato. La causa tipica e una registrazione incompleta o un account eliminato.",
      ],
      bullets: [
        "Banner di avviso automatico nella lista docenti quando ci sono inconsistenze.",
        "Filtro 'Con problemi' per visualizzare solo i docenti con inconsistenza.",
        "Badge ⚠ accanto allo stato del docente nella lista.",
        "Due opzioni di fix: 'Resetta e invia invito' (riporta a Inattivo) o 'Crea account manualmente' (crea utente con password temporanea).",
        "Fix massivo: resetta tutti i docenti inconsistenti a Inattivo con un click.",
        "Cron job giornaliero che rileva e corregge automaticamente le inconsistenze.",
      ],
      mockupKind: "admin-integrity",
    }),
    createSection({
      id: "admin-integrazioni-ai",
      title: "Integrazioni AI",
      icon: Sparkles,
      intro: "Configura l'integrazione con OpenRouter per le funzionalita AI del portale: import CV da PDF, suggerimenti automatici.",
      paragraphs: [
        "La configurazione e interamente da interfaccia, senza variabili d'ambiente. La API key viene salvata crittografata nel database.",
      ],
      bullets: [
        "Configura la API key OpenRouter dalla pagina Integrazioni AI.",
        "Seleziona il modello AI da utilizzare (es. Llama, Mistral, ecc.).",
        "Testa la connessione prima di salvare la configurazione.",
        "Consulta il log delle chiamate AI con dettaglio token e durata.",
        "Abilita/disabilita l'AI senza eliminare la configurazione.",
      ],
      note: "L'AI e usata per l'import CV da PDF nella registrazione docente e nel profilo.",
      mockupKind: "admin-ai",
    }),
  ];
}

function getTeacherSections(): GuideSection[] {
  return [
    createSection({
      id: "teacher-accesso",
      title: "Accesso al Portale Docente",
      icon: LogIn,
      intro: "Accedi al portale con le credenziali impostate durante la registrazione. L'invito arriva via email con link dedicato.",
      paragraphs: [
        "La registrazione docente prevede 4 step: dati personali, CV e competenze, firma dichiarazione sostitutiva, scelta password.",
        "Dopo la registrazione, accedi con email e password dalla pagina di login.",
      ],
      bullets: [
        "Ricevi l'invito via email con il link di registrazione.",
        "Compila i dati personali nello Step 1.",
        "Inserisci almeno 1 esperienza lavorativa e 1 titolo di studio nello Step 2.",
        "Firma la dichiarazione sostitutiva nello Step 3.",
        "Scegli la tua password nello Step 4.",
      ],
      note: "Il link di invito è valido per 7 giorni. Se scade, chiedi alla segreteria di reinviarlo.",
      mockupKind: "login",
    }),
    createSection({
      id: "teacher-dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
      intro: "La dashboard mostra le statistiche delle tue lezioni, il calendario mensile e le prossime attività da completare.",
      paragraphs: [
        "I pallini gold sul calendario indicano giorni con lezioni, i pallini grigi indicano indisponibilità. Il cerchio indica oggi.",
        "Il widget 'Presenze da registrare' evidenzia le lezioni passate per cui non hai ancora registrato le presenze.",
      ],
      bullets: [
        "Controlla le statistiche: lezioni prossime, totali, ore totali, corsi attivi.",
        "Usa il calendario per una vista mensile delle tue attività.",
        "Completa le presenze in sospeso dal widget dedicato.",
      ],
      mockupKind: "teacher-dashboard",
    }),
    createSection({
      id: "teacher-lezioni",
      title: "Le mie Lezioni",
      icon: BookOpen,
      intro: "La pagina lezioni mostra tutte le lezioni a te assegnate con filtri per periodo, corso e stato presenze.",
      paragraphs: [
        "Ogni card mostra data, orario, durata, corso, cliente, edizione, luogo e numero partecipanti.",
        "Il badge 'Presenze da registrare' indica le lezioni passate senza presenze completate.",
      ],
      bullets: [
        "Filtra per periodo: Tutte, Prossime, Passate.",
        "Usa la ricerca per trovare lezioni per corso, luogo o cliente.",
        "Clicca 'Dettaglio' per vedere informazioni complete e registrare le presenze.",
      ],
      mockupKind: "teacher-lessons",
    }),
    createSection({
      id: "teacher-presenze",
      title: "Registrazione Presenze",
      icon: ClipboardCheck,
      intro: "Registra le presenze dei partecipanti direttamente dalla pagina dettaglio lezione, con supporto per ore parziali e stati differenziati.",
      paragraphs: [
        "Per ogni partecipante puoi impostare lo stato: Presente (ore complete), Assente, o Assente Giustificato.",
        "Se un partecipante ha frequentato solo parte della lezione, inserisci le ore effettive nel campo dedicato.",
      ],
      bullets: [
        "Apri il dettaglio lezione e vai al tab Presenze.",
        "Usa i pulsanti rapidi 'Segna tutti presenti' o 'Segna tutti assenti'.",
        "Per ore parziali, modifica il campo ore del singolo partecipante.",
        "Salva le presenze con il pulsante dedicato.",
        "Scarica il registro presenze in PDF per archiviazione.",
      ],
      note: "Le presenze delle lezioni future sono in sola lettura. Puoi registrare solo lezioni passate o del giorno corrente.",
      mockupKind: "teacher-attendance",
    }),
    createSection({
      id: "teacher-materiali",
      title: "Materiale Didattico",
      icon: FolderOpen,
      intro: "Accedi ai materiali delle tue lezioni, scaricali o proponi nuovi file che verranno revisionati dall'admin.",
      paragraphs: [
        "I materiali approvati sono organizzati per categoria: Slide, Esercitazioni, Documenti, Normativa, Modelli.",
        "Puoi proporre materiale aggiuntivo con il pulsante 'Proponi file'. Il materiale proposto ha stato 'In attesa' finché l'admin non lo approva.",
      ],
      bullets: [
        "Consulta i materiali nel dettaglio lezione, tab Materiali.",
        "Scarica singoli file o tutto in formato ZIP.",
        "Usa l'anteprima inline per PDF e immagini.",
        "Proponi file: carica e attendi l'approvazione dell'admin.",
      ],
      note: "I tuoi file proposti mostrano lo stato: In attesa (arancione), Approvato (verde), Rifiutato (rosso con motivo).",
      mockupKind: "teacher-materials",
    }),
    createSection({
      id: "teacher-disponibilita",
      title: "Disponibilità",
      icon: Calendar,
      intro: "Gestisci la tua disponibilità indicando i periodi in cui non sei disponibile per lezioni.",
      paragraphs: [
        "Il calendario mostra le tue lezioni e i periodi di indisponibilità. Puoi aggiungere indisponibilità per giornata intera o per fascia oraria.",
        "Seleziona un range di date per creare indisponibilità su più giorni consecutivi.",
      ],
      bullets: [
        "Aggiungi indisponibilità dal calendario o dal pulsante dedicato.",
        "Specifica se è giornata intera o fascia oraria.",
        "Inserisci un motivo opzionale.",
        "Modifica o elimina indisponibilità esistenti.",
      ],
      note: "Se un'indisponibilità è in conflitto con una lezione assegnata, viene mostrato un avviso.",
      mockupKind: "teacher-availability",
    }),
    createSection({
      id: "teacher-documenti",
      title: "Documenti",
      icon: FileText,
      intro: "Nella sezione documenti trovi la dichiarazione sostitutiva firmata, il tuo CV e il documento di identità.",
      paragraphs: [
        "Puoi scaricare i documenti firmati e caricarne di nuovi quando necessario.",
      ],
      bullets: [
        "Scarica la dichiarazione sostitutiva firmata in PDF.",
        "Carica o aggiorna il tuo CV.",
        "Carica o aggiorna il documento di identità.",
      ],
      mockupKind: "teacher-documents",
    }),
    createSection({
      id: "teacher-cv",
      title: "CV e Competenze",
      icon: Briefcase,
      intro: "Il CV strutturato del portale ha 8 sezioni editabili. Le lezioni erogate vengono aggiunte automaticamente come esperienza docente.",
      paragraphs: [
        "Le sezioni obbligatorie (Esperienze lavorative e Formazione) devono avere almeno 1 elemento durante la registrazione.",
        "L'esperienza come docente viene sincronizzata automaticamente dalle lezioni erogate nel portale con badge 'Dal portale'. Queste entry non sono modificabili.",
      ],
      bullets: [
        "Modifica le sezioni CV dal tab 'CV e Competenze' nel profilo.",
        "Importa i dati da un CV PDF: il sistema analizza il file e precompila le sezioni automaticamente.",
        "Scarica il CV in formato Europass PDF generato dal portale.",
        "Le certificazioni mostrano badge di scadenza: verde, giallo o rosso.",
      ],
      note: "Le 8 sezioni: Esperienze, Formazione, Lingue, Certificazioni, Competenze tecniche, Corsi frequentati, Esperienza docente, Pubblicazioni.",
      mockupKind: "teacher-cv",
    }),
    createSection({
      id: "teacher-cv-dpr445",
      title: "CV DPR 445/2000",
      icon: ClipboardCheck,
      intro: "Il CV DPR 445/2000 e il Curriculum Vitae ai sensi del DPR 445/2000 richiesto per i formatori in materia di salute e sicurezza sul lavoro.",
      paragraphs: [
        "Quando richiesto dall'amministrazione, troverai un avviso nella dashboard e un badge nella sidebar. La pagina di compilazione ti guida attraverso tutte le sezioni del documento.",
        "Puoi salvare una bozza e completare in un secondo momento. Una volta inviato, il CV verra revisionato dall'amministrazione che potra approvarlo o richiedere correzioni.",
      ],
      bullets: [
        "Vai nella sezione 'CV DPR 445' dal menu laterale.",
        "Scarica il template PDF vuoto e compilalo (a mano o con un editor PDF).",
        "Carica il PDF compilato nella pagina.",
        "Compila il form con le informazioni principali: criterio formatore, aree tematiche, abilitazioni.",
        "Clicca 'Invia CV' per inviare il documento all'amministrazione.",
        "Se il CV viene rifiutato, potrai ricompilarlo con i dati precedenti gia precompilati.",
      ],
      note: "Il consenso privacy e obbligatorio per l'invio. Il PDF caricato e i dati del form vengono conservati nel portale.",
      mockupKind: "teacher-cv-dpr445",
    }),
    createSection({
      id: "teacher-supporto",
      title: "Supporto e Ticket",
      icon: LifeBuoy,
      intro: "Apri ticket per comunicare con la segreteria, segnalare problemi o fare richieste operative.",
      paragraphs: [
        "Ogni ticket mantiene una cronologia di messaggi come una chat. Lo stato evolve da Aperto a In lavorazione a Chiuso.",
      ],
      bullets: [
        "Apri un nuovo ticket con oggetto, categoria e descrizione.",
        "Allega file opzionali al ticket.",
        "Segui lo stato e rispondi nella chat del ticket.",
      ],
      mockupKind: "teacher-ticket",
    }),
    createSection({
      id: "teacher-profilo",
      title: "Profilo",
      icon: UserCircle,
      intro: "Aggiorna i tuoi dati anagrafici, cambia la password e gestisci le impostazioni del tuo account.",
      paragraphs: [
        "L'email non è modificabile dal profilo: contatta l'admin per cambiamenti. Gli altri dati possono essere aggiornati in qualsiasi momento.",
      ],
      bullets: [
        "Aggiorna dati personali, residenza, contatti e dati professionali.",
        "Cambia password con requisiti: almeno 8 caratteri, maiuscola, numero e carattere speciale.",
        "Le modifiche al profilo vengono salvate immediatamente.",
      ],
      mockupKind: "teacher-profile",
    }),
  ];
}

function getGuideSections(role: GuideRole): GuideSection[] {
  if (role === "TEACHER") return getTeacherSections();
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
      : role === "TEACHER"
        ? "Guida operativa per docenti: lezioni, presenze, materiali, CV, disponibilità, documenti e supporto."
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
