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
  ClipboardCheck,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  History,
  Home,
  LayoutDashboard,
  LogIn,
  Menu,
  Plus,
  Search,
  UserCog,
  Users,
  X,
} from "lucide-react";

type SectionConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const sections: SectionConfig[] = [
  { id: "login", label: "Login e Accesso", icon: LogIn },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "corsi", label: "I Tuoi Corsi", icon: BookOpen },
  { id: "anagrafiche", label: "Compilare le Anagrafiche", icon: FileSpreadsheet },
  { id: "dipendenti", label: "Gestione Dipendenti", icon: Users },
  { id: "presenze", label: "Presenze", icon: ClipboardCheck },
  { id: "attestati", label: "Attestati", icon: Award },
  { id: "notifiche", label: "Notifiche", icon: Bell },
  { id: "storico", label: "Storico Formazione", icon: History },
  { id: "profilo", label: "Profilo e Password", icon: UserCog },
];

function MockupWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#1A1A1A] px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
        </div>
        <span className="ml-3 text-xs text-white/40">{title}</span>
      </div>
      <div className="overflow-x-auto bg-gray-50 p-6 text-sm text-gray-800">{children}</div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
        <Icon className="h-4 w-4 text-[#EAB308]" />
      </div>
      <div>
        <h4 className="mb-1 text-sm font-medium text-white">{title}</h4>
        <p className="text-sm leading-relaxed text-white/55">{description}</p>
      </div>
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
        className="text-2xl font-bold md:text-3xl"
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
    <section id={id} className="scroll-mt-28">
      <SectionHeader icon={icon} title={title} />
      <p className="mb-6 leading-relaxed text-white/70">{description}</p>
      {children}
    </section>
  );
}

export default function ComeFunzionaPage() {
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [isMobileIndexOpen, setIsMobileIndexOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const sectionIds = useMemo(() => sections.map((s) => s.id), []);

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
          if (entry.isIntersecting) setActiveSection(id);
        },
        { threshold: 0.3, rootMargin: "-100px 0px -50% 0px" }
      );
      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [sectionIds]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" style={{ fontFamily: "var(--font-body)" }}>
      <div
        className="fixed left-0 top-0 z-[100] h-[3px] bg-[#EAB308] shadow-[0_0_18px_rgba(234,179,8,0.7)]"
        style={{ width: `${scrollProgress}%` }}
      />

      <header className="fixed left-0 right-0 top-[2px] z-50 border-b border-white/5 bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/icons/i-down-remove.png" alt="Sapienta" width={32} height={32} />
            <span
              className="text-lg font-semibold tracking-[0.2em] text-white"
              style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
            >
              SAPIENTA
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="hidden items-center gap-2 text-sm font-medium text-[#EAB308] sm:inline-flex">
              <HelpCircle className="h-4 w-4" />
              Come Funziona
            </span>
            <Link
              href="/login"
              className="rounded-lg bg-[#EAB308] px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-[#FACC15]"
            >
              Area Clienti
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-28">
        <section className="relative overflow-hidden px-6 pb-12 pt-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.12),transparent_55%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <h1
              className="text-4xl font-semibold md:text-6xl"
              style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
            >
              Come Funziona il Portale
            </h1>
            <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-white/70">
              Guida completa per utilizzare al meglio il portale clienti Sapienta: accesso,
              gestione corsi, compilazione anagrafiche, presenze, attestati e profilo.
            </p>
            <button
              type="button"
              onClick={() => scrollToSection("login")}
              className="mt-8 inline-flex items-center gap-2 rounded-lg border border-[#EAB308]/30 bg-[#EAB308]/10 px-4 py-2 text-sm font-medium text-[#EAB308] transition-colors hover:bg-[#EAB308]/20"
            >
              Indice delle sezioni
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-7xl gap-12 px-6 pb-20">
          <nav className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-28 space-y-1">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">Indice</p>
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-[#EAB308]/10 text-[#EAB308]"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1">
            <div className="mb-8 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileIndexOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm text-white/90"
              >
                <span className="inline-flex items-center gap-2">
                  <Menu className="h-4 w-4 text-[#EAB308]" />
                  Indice sezioni
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-white/60 transition-transform ${isMobileIndexOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isMobileIndexOpen ? (
                <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/30 p-2">
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
                            : "text-white/70"
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

            <div className="max-w-4xl space-y-24">
              <GuideSection id="login" title="Login e Accesso" icon={LogIn} description="Per accedere al portale usa le credenziali fornite (email e password). Dalla pagina principale clicca su Area Clienti.">
                <MockupWindow title="Portale Sapienta - Login"><div className="mx-auto max-w-sm space-y-4 py-6"><div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400">Email</div><div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400">Password</div><div className="rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white">Accedi</div><p className="text-center text-xs text-blue-600">Password dimenticata?</p></div></MockupWindow>
              </GuideSection>

              <GuideSection id="dashboard" title="Dashboard" icon={LayoutDashboard} description="La dashboard offre una panoramica rapida: corsi attivi, dipendenti, attestati e attività recenti.">
                <MockupWindow title="Dashboard Cliente"><div className="grid gap-3 md:grid-cols-4">{[{ label: "Corsi Attivi", value: "3" },{ label: "Dipendenti", value: "45" },{ label: "Attestati", value: "12" },{ label: "Scadenze", value: "2" }].map((item) => (<div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3"><p className="text-xs text-gray-500">{item.label}</p><p className="text-2xl font-semibold text-gray-800">{item.value}</p></div>))}</div></MockupWindow>
              </GuideSection>

              <GuideSection id="corsi" title="I Tuoi Corsi" icon={BookOpen} description="Qui trovi tutte le edizioni assegnate, con filtri per ricerca, stato, anno e categoria.">
                <MockupWindow title="Corsi Cliente"><div className="space-y-3"><div className="grid gap-2 md:grid-cols-4"><div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-400"><Search className="mr-1 inline h-3 w-3" /> Cerca</div><div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500"><Filter className="mr-1 inline h-3 w-3" /> Stato</div><div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">Anno</div><div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">Categoria</div></div><div className="rounded-lg border border-gray-200 bg-white p-4"><div className="flex items-center justify-between"><p className="font-semibold text-gray-800">Sicurezza sul Lavoro - Ed. #2</p><span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Aperto</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Gestisci Anagrafiche</span><span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700">Vedi Presenze</span><span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700">Scarica Attestati</span></div></div></div></MockupWindow>
              </GuideSection>

              <GuideSection id="anagrafiche" title="Compilare le Anagrafiche" icon={FileSpreadsheet} description="Apri il corso e clicca Gestisci Anagrafiche. Il foglio stile Excel salva in automatico e supporta autocompletamento CF, decodifica dati e pulsante Altro.">
                <MockupWindow title="Anagrafiche - Sicurezza sul Lavoro (Ed. #2)"><div className="space-y-3"><div className="flex items-center gap-2"><div className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"><Plus className="h-3 w-3" /> Aggiungi da elenco</div><div className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700"><Check className="h-3 w-3" /> Salvato</div></div><div className="overflow-x-auto rounded-lg border"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-100"><th className="px-3 py-2 text-left">Nome *</th><th className="px-3 py-2 text-left">Cognome *</th><th className="px-3 py-2 text-left">CF *</th><th className="px-3 py-2 text-left">Sesso *</th><th className="px-3 py-2 text-left">Data *</th><th className="px-3 py-2 text-left">Email *</th><th className="px-3 py-2 text-center">Altro</th></tr></thead><tbody><tr className="border-b"><td className="px-3 py-2">Mario</td><td className="px-3 py-2">Rossi</td><td className="px-3 py-2 font-mono text-[10px]">RSSMRA80A01H501Z</td><td className="px-3 py-2">M</td><td className="px-3 py-2">01/01/1980</td><td className="px-3 py-2">mario@email.it</td><td className="px-3 py-2 text-center"><span className="inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Altro ✓</span></td></tr><tr><td className="px-3 py-2">Laura</td><td className="px-3 py-2">Bianchi</td><td className="px-3 py-2 font-mono text-[10px]">BNCLRA85B02F205X</td><td className="px-3 py-2">F</td><td className="px-3 py-2">02/02/1985</td><td className="px-3 py-2">laura@email.it</td><td className="px-3 py-2 text-center"><span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Altro</span></td></tr></tbody></table></div><div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-3 shadow-sm"><p className="text-sm font-medium text-gray-800">👤 Dipendente trovato</p><div className="text-xs font-medium text-blue-600 underline">Compila automaticamente</div></div></div></MockupWindow>
                <div className="mt-6 space-y-4"><FeatureItem icon={FileSpreadsheet} title="Foglio Excel" description="Le colonne con asterisco sono obbligatorie. Il salvataggio è automatico." /><FeatureItem icon={Search} title="Autocompletamento CF" description="Se il CF esiste già, il sistema propone la compilazione completa con un click." /><FeatureItem icon={Users} title="Aggiungi da Elenco" description="Selezioni più dipendenti già esistenti senza reinserire dati." /><FeatureItem icon={Plus} title="Pulsante Altro" description="Apre i campi opzionali. Diventa verde quando presenti dati extra." /></div>
              </GuideSection>

              <GuideSection id="dipendenti" title="Gestione Dipendenti" icon={Users} description="Archivio completo con ricerca, filtri, dettaglio corsi e creazione nuovo dipendente.">
                <MockupWindow title="Dipendenti"><div className="space-y-3"><div className="flex items-center justify-between"><div className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-500"><Search className="h-3 w-3" /> Cerca</div><div className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"><Plus className="h-3 w-3" /> Aggiungi dipendente</div></div><div className="overflow-x-auto rounded-lg border border-gray-200 bg-white"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-100"><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Cognome</th><th className="px-3 py-2 text-left">CF</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-right">Azioni</th></tr></thead><tbody><tr><td className="px-3 py-2">Mario</td><td className="px-3 py-2">Rossi</td><td className="px-3 py-2 font-mono text-[10px]">RSSMRA80A01H501Z</td><td className="px-3 py-2">mario@email.it</td><td className="px-3 py-2 text-right"><span className="inline-flex items-center gap-1 text-blue-600"><Eye className="h-3 w-3" /> Dettaglio</span></td></tr></tbody></table></div></div></MockupWindow>
              </GuideSection>

              <GuideSection id="presenze" title="Presenze" icon={ClipboardCheck} description="Le presenze sono compilate dall&apos;admin. Il cliente visualizza la griglia lezioni/dipendenti.">
                <MockupWindow title="Presenze"><div className="overflow-x-auto rounded-lg border border-gray-200 bg-white"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-100"><th className="px-3 py-2 text-left">Dipendente</th><th className="px-3 py-2 text-center">L1</th><th className="px-3 py-2 text-center">L2</th><th className="px-3 py-2 text-center">L3</th></tr></thead><tbody><tr className="border-b"><td className="px-3 py-2">Mario Rossi</td><td className="px-3 py-2 text-center text-green-600"><Check className="mx-auto h-4 w-4" /></td><td className="px-3 py-2 text-center text-green-600"><Check className="mx-auto h-4 w-4" /></td><td className="px-3 py-2 text-center text-red-500"><X className="mx-auto h-4 w-4" /></td></tr><tr><td className="px-3 py-2">Laura Bianchi</td><td className="px-3 py-2 text-center text-green-600"><Check className="mx-auto h-4 w-4" /></td><td className="px-3 py-2 text-center text-green-600"><Check className="mx-auto h-4 w-4" /></td><td className="px-3 py-2 text-center text-green-600"><Check className="mx-auto h-4 w-4" /></td></tr></tbody></table></div></MockupWindow>
              </GuideSection>

              <GuideSection id="attestati" title="Attestati" icon={Award} description="Consulta, filtra e scarica certificati singoli oppure ZIP completi per corso.">
                <MockupWindow title="Attestati"><div className="space-y-2"><div className="flex justify-end"><span className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-white"><Download className="h-3 w-3" /> Scarica Tutti (ZIP)</span></div><div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"><span>Mario Rossi - Sicurezza sul Lavoro</span><span className="inline-flex items-center gap-1 text-blue-600"><Download className="h-3 w-3" /> Scarica</span></div></div></MockupWindow>
              </GuideSection>

              <GuideSection id="notifiche" title="Notifiche" icon={Bell} description="La campanella mostra aggiornamenti importanti; puoi marcare singole notifiche o tutte come lette.">
                <MockupWindow title="Notifiche"><div className="space-y-2"><div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />Nuova edizione disponibile</div><div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />Nuovi attestati disponibili</div><div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-transparent" />Presenze aggiornate</div></div></MockupWindow>
              </GuideSection>

              <GuideSection id="storico" title="Storico Formazione" icon={History} description="Storico corsi completati, statistiche aggregate e dettaglio partecipanti per edizione.">
                <MockupWindow title="Storico Formazione"><div className="space-y-3"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-md border border-gray-200 bg-white p-3"><p className="text-xs text-gray-500">Corsi completati</p><p className="text-xl font-semibold">8</p></div><div className="rounded-md border border-gray-200 bg-white p-3"><p className="text-xs text-gray-500">Dipendenti formati</p><p className="text-xl font-semibold">45</p></div><div className="rounded-md border border-gray-200 bg-white p-3"><p className="text-xs text-gray-500">Attestati</p><p className="text-xl font-semibold">92</p></div></div><div className="rounded-lg border border-gray-200 bg-white p-3 text-xs"><div className="flex items-center justify-between font-medium"><span>Sicurezza sul Lavoro - Ed. #1</span><span className="inline-flex items-center gap-1 text-gray-500"><ChevronRight className="h-3 w-3" /> Espandi</span></div></div></div></MockupWindow>
              </GuideSection>

              <GuideSection id="profilo" title="Profilo e Password" icon={UserCog} description="Aggiorna la password inserendo quella attuale, la nuova e la conferma.">
                <MockupWindow title="Profilo - Cambio Password"><div className="mx-auto max-w-md space-y-3"><div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">Password attuale</div><div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">Nuova password</div><div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">Conferma password</div><div className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white"><Edit className="h-3 w-3" /> Aggiorna password</div></div></MockupWindow>
              </GuideSection>

              <section className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center md:p-12">
                <h3 className="text-3xl md:text-4xl" style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}>Pronto per iniziare?</h3>
                <p className="mx-auto mt-4 max-w-2xl text-white/70">Accedi al portale e gestisci i tuoi corsi di formazione in un unico ambiente.</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-[#EAB308] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15]">Accedi all&apos;Area Clienti <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"><ArrowLeft className="h-4 w-4" /> Torna alla Home</Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Image src="/icons/i-down-remove.png" alt="" width={20} height={20} />
            <span className="text-sm tracking-wider text-white/60">SAPIENTA</span>
          </div>
          <p className="text-xs text-white/30">© {new Date().getFullYear()} Sapienta - Ente di Formazione. Tutti i diritti riservati.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-[#EAB308]"><Home className="h-3 w-3" /> Torna alla Home</Link>
        </div>
      </footer>
    </div>
  );
}
