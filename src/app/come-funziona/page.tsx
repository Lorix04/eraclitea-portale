"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  History,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  Menu,
  Search,
  UserCog,
  Users,
  X,
} from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";

type SectionConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const sections: SectionConfig[] = [
  { id: "login", label: "Accesso al Portale", icon: LogIn },
  { id: "dashboard", label: "La tua Dashboard", icon: LayoutDashboard },
  { id: "corsi", label: "I tuoi Corsi", icon: BookOpen },
  { id: "anagrafiche", label: "Compilazione Anagrafiche Dipendenti", icon: FileSpreadsheet },
  { id: "dipendenti", label: "I tuoi Dipendenti", icon: Users },
  { id: "presenze", label: "Presenze e Ore", icon: ClipboardCheck },
  { id: "attestati", label: "Attestati e Certificazioni", icon: Award },
  { id: "storico", label: "Storico Formazione", icon: History },
  { id: "notifiche", label: "Notifiche", icon: Bell },
  { id: "supporto", label: "Supporto e Ticket", icon: LifeBuoy },
  { id: "profilo", label: "Il tuo Profilo", icon: UserCog },
];

function MockupWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-6 w-full max-w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-3 py-2 dark:border-white/10 dark:bg-[#1A1A1A]">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="ml-2 text-[11px] text-gray-500 dark:text-white/50">{title}</span>
      </div>
      <div className="bg-gray-50 p-4 text-xs text-gray-700 dark:bg-[#111315] dark:text-white/80 sm:p-6 sm:text-sm">
        <div className="max-w-full overflow-x-auto">{children}</div>
      </div>
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{children}</span>
      </p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAB308]/10">
        <Icon className="h-5 w-5 text-[#EAB308]" />
      </div>
      <h2
        className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl"
        style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
      >
        {title}
      </h2>
    </div>
  );
}

function GuideSection({
  id,
  title,
  icon,
  description,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-gray-200/70 pb-14 pt-2 last:border-b-0 dark:border-white/10">
      <SectionHeader icon={icon} title={title} />
      <p className="mb-5 text-sm leading-relaxed text-gray-600 dark:text-white/70 sm:text-base">
        {description}
      </p>
      {children}
    </section>
  );
}

export default function ComeFunzionaPage() {
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [isMobileIndexOpen, setIsMobileIndexOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const sectionIds = useMemo(() => sections.map((section) => section.id), []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsMobileIndexOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.35, rootMargin: "-110px 0px -45% 0px" }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [sectionIds]);

  return (
    <div
      className="min-h-screen max-w-[100vw] overflow-x-hidden bg-gray-50 text-gray-900 dark:bg-[#0A0A0A] dark:text-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div
        className="fixed left-0 top-0 z-[100] h-[3px] bg-[#EAB308] shadow-[0_0_18px_rgba(234,179,8,0.7)]"
        style={{ width: `${scrollProgress}%` }}
      />

      <PublicNavbar
        currentPath="/come-funziona"
        onHoverChange={setIsHovering}
        className={
          scrollProgress > 2
            ? "border-b border-gray-200 bg-white/90 shadow-lg shadow-gray-300/30 backdrop-blur-md dark:border-[#EAB308]/10 dark:bg-[#0A0A0A]/80 dark:shadow-black/20"
            : "bg-transparent"
        }
      />

      <main className="pt-28">
        <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.12),transparent_55%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <h1
              className="text-3xl font-semibold sm:text-5xl"
              style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
            >
              Come Funziona il Portale Clienti
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-white/70 sm:text-base">
              Una guida pratica, passo dopo passo, per usare tutte le funzionalità disponibili
              nell&apos;area cliente.
            </p>
            <button
              type="button"
              onClick={() => scrollToSection("login")}
              className="mt-7 inline-flex items-center gap-2 rounded-lg border border-[#EAB308]/40 bg-[#EAB308]/10 px-4 py-2 text-sm font-medium text-[#EAB308] transition-colors hover:bg-[#EAB308]/20"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Vai all&apos;indice
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:gap-12">
          <nav className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-28 space-y-1">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/40">
                Indice
              </p>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-[#EAB308]/10 text-[#EAB308]"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            <div className="mb-8 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileIndexOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/90"
              >
                <span className="inline-flex items-center gap-2">
                  <Menu className="h-4 w-4 text-[#EAB308]" />
                  Indice sezioni
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-600 transition-transform dark:text-white/60 ${
                    isMobileIndexOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isMobileIndexOpen ? (
                <div className="mt-2 space-y-1 rounded-lg border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-black/30">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                          activeSection === section.id
                            ? "bg-[#EAB308]/10 text-[#EAB308]"
                            : "text-gray-600 dark:text-white/70"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="max-w-4xl space-y-0">
              <GuideSection
                id="login"
                title="Accesso al Portale"
                icon={LogIn}
                description="Accedi con le credenziali ricevute via email. Dopo il login troverai subito corsi, notifiche e attività in evidenza."
              >
                <MockupWindow title="Login - Portale Sapienta">
                  <div className="mx-auto w-full max-w-sm space-y-3">
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-400">
                      Email
                    </div>
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-400">
                      Password
                    </div>
                    <button className="w-full rounded-lg bg-[#EAB308] px-4 py-2.5 text-sm font-semibold text-black">
                      Accedi
                    </button>
                  </div>
                </MockupWindow>
                <InfoNote>
                  Al primo accesso ti verrà chiesto di cambiare la password per motivi di sicurezza.
                </InfoNote>
              </GuideSection>

              <GuideSection
                id="dashboard"
                title="La tua Dashboard"
                icon={LayoutDashboard}
                description="Una panoramica immediata su corsi attivi, dipendenti registrati, attestati disponibili, ticket aperti, scadenze e notifiche recenti."
              >
                <MockupWindow title="Dashboard Cliente">
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Corsi Attivi", value: "4" },
                      { label: "Dipendenti", value: "37" },
                      { label: "Attestati", value: "19" },
                      { label: "Ticket Aperti", value: "2" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="mt-1 text-xl font-semibold text-gray-800">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="corsi"
                title="I tuoi Corsi"
                icon={BookOpen}
                description="Consulta i corsi assegnati, entra nelle edizioni attive, verifica date e controlla le deadline per compilare o inviare le anagrafiche."
              >
                <MockupWindow title="Corsi ed Edizioni">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
                      <Search className="h-3 w-3" />
                      Cerca corso o edizione
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">Antincendio Rischio Medio - Ed. #3</p>
                        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                          Anagrafiche da compilare
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Deadline invio anagrafiche: 25/03/2026</p>
                    </div>
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="anagrafiche"
                title="Compilazione Anagrafiche Dipendenti"
                icon={FileSpreadsheet}
                description="Apri l&apos;edizione e compila il foglio Excel integrato con i dati richiesti. Salva e invia quando tutte le righe risultano corrette."
              >
                <MockupWindow title="Spreadsheet Anagrafiche">
                  <table className="min-w-[700px] w-full border-collapse">
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
                        <td className="px-3 py-2 bg-red-50 text-red-600">CF non valido</td>
                        <td className="px-3 py-2">marco@azienda.it</td>
                        <td className="px-3 py-2">MI</td>
                        <td className="px-3 py-2">Lombardia</td>
                      </tr>
                    </tbody>
                  </table>
                </MockupWindow>
                <InfoNote>
                  I dati vengono validati automaticamente. Le celle con errori saranno evidenziate in rosso.
                </InfoNote>
              </GuideSection>

              <GuideSection
                id="dipendenti"
                title="I tuoi Dipendenti"
                icon={Users}
                description="Gestisci l&apos;anagrafica completa: aggiunta nuovi dipendenti, modifica dati, verifica codice fiscale e consultazione storico formativo individuale."
              >
                <MockupWindow title="Elenco Dipendenti">
                  <table className="min-w-[640px] w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-100 text-left">
                        <th className="px-3 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">Cognome</th>
                        <th className="px-3 py-2 font-medium">Codice Fiscale</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                        <th className="px-3 py-2 text-right font-medium">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b bg-white">
                        <td className="px-3 py-2">Elena</td>
                        <td className="px-3 py-2">Conti</td>
                        <td className="px-3 py-2 font-mono text-[11px]">CNTLNE88C51F205R</td>
                        <td className="px-3 py-2">elena@azienda.it</td>
                        <td className="px-3 py-2 text-right text-blue-600">Dettaglio</td>
                      </tr>
                    </tbody>
                  </table>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="presenze"
                title="Presenze e Ore"
                icon={ClipboardCheck}
                description="Controlla lezioni frequentate, ore registrate e percentuale complessiva di presenza rispetto al requisito minimo dell&apos;edizione."
              >
                <MockupWindow title="Riepilogo Presenze">
                  <div className="space-y-3">
                    <table className="min-w-[580px] w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-100 text-left">
                          <th className="px-3 py-2 font-medium">Dipendente</th>
                          <th className="px-3 py-2 font-medium">Ore frequentate</th>
                          <th className="px-3 py-2 font-medium">% Presenza</th>
                          <th className="px-3 py-2 font-medium">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b bg-white">
                          <td className="px-3 py-2">Elena Conti</td>
                          <td className="px-3 py-2">28 / 32h</td>
                          <td className="px-3 py-2">87.5%</td>
                          <td className="px-3 py-2 text-green-600">Sopra soglia</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-3 py-2">Luca Neri</td>
                          <td className="px-3 py-2">18 / 32h</td>
                          <td className="px-3 py-2">56.2%</td>
                          <td className="px-3 py-2 text-red-600">Sotto soglia</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-green-700">
                        <Check className="h-3 w-3" />
                        Presente
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-red-700">
                        <X className="h-3 w-3" />
                        Assente
                      </span>
                    </div>
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="attestati"
                title="Attestati e Certificazioni"
                icon={Award}
                description="Scarica gli attestati disponibili e controlla velocemente lo stato delle certificazioni: valide, in scadenza o scadute."
              >
                <MockupWindow title="Archivio Attestati">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
                      <span>Formazione Generale - Elena Conti</span>
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Valido</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
                      <span>Antincendio - Luca Neri</span>
                      <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">In scadenza</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
                      <span>Primo Soccorso - Marco Verdi</span>
                      <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">Scaduto</span>
                    </div>
                    <button className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#EAB308] px-3 py-2 text-xs font-semibold text-black">
                      <Download className="h-3.5 w-3.5" />
                      Scarica selezionati
                    </button>
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="storico"
                title="Storico Formazione"
                icon={History}
                description="Consulta i corsi completati nel tempo, i dipendenti formati e lo storico delle certificazioni archiviate."
              >
                <MockupWindow title="Storico">
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { label: "Corsi completati", value: "12" },
                        { label: "Dipendenti formati", value: "61" },
                        { label: "Certificazioni", value: "144" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs text-gray-500">{item.label}</p>
                          <p className="mt-1 text-lg font-semibold text-gray-800">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white p-3 text-xs">
                      Sicurezza sul lavoro - Ed. #1 completata il 14/11/2025
                    </div>
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="notifiche"
                title="Notifiche"
                icon={Bell}
                description="Ricevi aggiornamenti su nuove edizioni, scadenze imminenti, attestati disponibili e risposte ai ticket di assistenza."
              >
                <MockupWindow title="Centro Notifiche">
                  <div className="space-y-2">
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                      Nuova edizione assegnata: Aggiornamento RSPP
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                      Attestati disponibili per download
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                      Deadline anagrafiche tra 2 giorni
                    </div>
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="supporto"
                title="Supporto e Ticket"
                icon={LifeBuoy}
                description="Apri richieste di assistenza, allega documenti utili e monitora lo stato della lavorazione fino alla risoluzione."
              >
                <MockupWindow title="Nuovo Ticket Supporto">
                  <div className="mx-auto w-full max-w-xl space-y-3">
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-500">
                      Oggetto ticket
                    </div>
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-500">
                      Categoria
                    </div>
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-500">
                      Descrizione problema
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Aperto</span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">In lavorazione</span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      <span className="rounded bg-green-100 px-2 py-1 text-green-700">Risolto</span>
                    </div>
                  </div>
                </MockupWindow>
              </GuideSection>

              <GuideSection
                id="profilo"
                title="Il tuo Profilo"
                icon={UserCog}
                description="Aggiorna i dati del tuo account e modifica la password in qualsiasi momento dalla sezione Profilo."
              >
                <MockupWindow title="Profilo Utente">
                  <div className="mx-auto w-full max-w-md space-y-3">
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-500">
                      Password attuale
                    </div>
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-500">
                      Nuova password
                    </div>
                    <div className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-500">
                      Conferma nuova password
                    </div>
                    <button className="w-full rounded-lg bg-[#EAB308] px-4 py-2.5 text-sm font-semibold text-black">
                      Salva modifiche
                    </button>
                  </div>
                </MockupWindow>
              </GuideSection>

              <section className="rounded-3xl border border-gray-200 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-black/20 md:p-12">
                <h3
                  className="text-2xl font-semibold md:text-4xl"
                  style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
                >
                  Pronto a usare il portale?
                </h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm text-gray-600 dark:text-white/70 sm:text-base">
                  Accedi alla tua area cliente per gestire corsi, anagrafiche, presenze,
                  attestati e supporto in un unico ambiente.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#EAB308] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15]"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    Accedi all&apos;Area Clienti
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Torna alla Home
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 dark:border-white/10">
        <div className="mx-auto w-full max-w-7xl px-4 text-center sm:px-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Image src="/icons/i-down-remove.png" alt="" width={20} height={20} />
            <span className="text-sm tracking-wider text-gray-600 dark:text-white/60">SAPIENTA</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-white/40">
            © {new Date().getFullYear()} Sapienta - Portale Formazione. Tutti i diritti riservati.{" "}
            <Link href="/privacy-policy" className="underline-offset-2 hover:underline">
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link href="/cookie-policy" className="underline-offset-2 hover:underline">
              Cookie Policy
            </Link>
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-[#EAB308] dark:text-white/50"
          >
            <Home className="h-3 w-3" />
            Torna alla Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
