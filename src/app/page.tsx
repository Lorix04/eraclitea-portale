"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronDown,
  Clock,
  Headphones,
  HelpCircle,
  Shield,
  Users,
} from "lucide-react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
};

function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onHoverChange?: (value: boolean) => void;
};

function TiltCard({ children, className = "", disabled = false, onHoverChange }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState(
    "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)"
  );
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -12;
    const rotateY = (x - 0.5) * 12;

    setTransform(
      `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
    );
    setGlowPos({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)");
    onHoverChange?.(false);
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#121212] p-7 transition-transform duration-200 ease-out hover:border-[#EAB308]/40 ${className}`}
      style={{ transform: disabled ? undefined : transform }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={handleMouseLeave}
    >
      {!disabled ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 hover:opacity-100"
          style={{
            background: `radial-gradient(300px circle at ${glowPos.x}% ${glowPos.y}%, rgba(234,179,8,0.15), transparent 50%)`,
          }}
        />
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

type MagneticButtonProps = {
  href: string;
  children: React.ReactNode;
  isMobile: boolean;
  onHoverChange?: (value: boolean) => void;
};

function MagneticButton({ href, children, isMobile, onHoverChange }: MagneticButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = event.clientX - centerX;
    const distY = event.clientY - centerY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < 100) {
      const force = (100 - dist) / 100;
      setOffset({ x: distX * force * 0.15, y: distY * force * 0.15 });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const reset = () => {
    setOffset({ x: 0, y: 0 });
    onHoverChange?.(false);
  };

  return (
    <div
      className={`inline-block ${isMobile ? "w-full" : "p-2 md:p-3"}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={reset}
    >
      <Link
        ref={buttonRef}
        href={href}
        className={`inline-flex items-center justify-center gap-3 rounded-xl bg-[#EAB308] px-8 py-4 text-lg font-bold text-black shadow-[0_12px_36px_rgba(234,179,8,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#FACC15] ${
          isMobile ? "w-full" : ""
        }`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {children}
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [logoFlash, setLogoFlash] = useState(false);

  const dotRef = useRef<HTMLDivElement | null>(null);
  const followerRef = useRef<HTMLDivElement | null>(null);
  const mousePosRef = useRef({ x: -100, y: -100 });
  const followerPosRef = useRef({ x: -100, y: -100 });
  const lastSpotlightUpdate = useRef(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasMouseRef = useRef({ x: 0, y: 0 });

  const servicesReveal = useScrollReveal<HTMLElement>();
  const processReveal = useScrollReveal<HTMLElement>(0.25);
  const reasonsReveal = useScrollReveal<HTMLElement>();
  const ctaReveal = useScrollReveal<HTMLElement>();

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (isMobile || !loaded) return;

    const x = event.clientX;
    const y = event.clientY;
    mousePosRef.current = { x, y };

    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
    }

    const now = Date.now();
    if (now - lastSpotlightUpdate.current > 50) {
      lastSpotlightUpdate.current = now;
      setMousePos({ x, y });
    }
  }, [isMobile, loaded]);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");

    const updateMobile = () => {
      setIsMobile(window.innerWidth < 768 || !mediaQuery.matches);
    };

    updateMobile();

    window.addEventListener("resize", updateMobile);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMobile);
    }

    return () => {
      window.removeEventListener("resize", updateMobile);
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateMobile);
      }
    };
  }, []);

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
    if (isMobile || !loaded) return;

    let animationId = 0;
    const animate = () => {
      followerPosRef.current.x += (mousePosRef.current.x - followerPosRef.current.x) * 0.15;
      followerPosRef.current.y += (mousePosRef.current.y - followerPosRef.current.y) * 0.15;

      if (followerRef.current) {
        const size = followerRef.current.classList.contains("cursor-hovering") ? 64 : 40;
        followerRef.current.style.transform = `translate(${followerPosRef.current.x - size / 2}px, ${followerPosRef.current.y - size / 2}px)`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isMobile, loaded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles: Particle[] = [];
    const count = window.innerWidth < 768 ? 30 : 70;

    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    const updateMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      canvasMouseRef.current.x = event.clientX - rect.left;
      canvasMouseRef.current.y = event.clientY - rect.top;
    };

    canvas.addEventListener("mousemove", updateMouse);

    let animationId = 0;

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        if (!isMobile) {
          const dx = particle.x - canvasMouseRef.current.x;
          const dy = particle.y - canvasMouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0 && distance < 120) {
            const force = (120 - distance) / 120;
            particle.vx += (dx / distance) * force * 0.5;
            particle.vy += (dy / distance) * force * 0.5;
          }
        }

        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(234, 179, 8, ${particle.opacity})`;
        context.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", updateMouse);
    };
  }, [isMobile]);

  const scrollToNextSection = () => {
    const section = document.getElementById("stats-section");
    section?.scrollIntoView({ behavior: "smooth" });
  };

  const triggerLogoFlash = () => {
    setLogoFlash(true);
    window.setTimeout(() => setLogoFlash(false), 500);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0A0A] transition-opacity duration-500 ${
          loaded ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="preloader-logo">
          <Image
            src="/icons/sapienta-remove.png"
            alt="Sapienta"
            width={120}
            height={120}
            priority
          />
        </div>
      </div>

      <div
        className="fixed left-0 top-0 z-[100] h-[3px] bg-[#EAB308] shadow-[0_0_18px_rgba(234,179,8,0.7)]"
        style={{ width: `${scrollProgress}%` }}
      />

      {!isMobile ? (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(234, 179, 8, 0.04), transparent 40%)`,
              opacity: loaded ? 1 : 0,
            }}
          />
          <div
            ref={dotRef}
            className="pointer-events-none fixed left-0 top-0 z-[10000] h-2 w-2 rounded-full bg-[#EAB308] mix-blend-difference transition-opacity duration-300"
            style={{ willChange: "transform", transform: "translate(-120px, -120px)", opacity: loaded ? 1 : 0 }}
          />
          <div
            ref={followerRef}
            className={`pointer-events-none fixed left-0 top-0 rounded-full border border-[#EAB308]/50 transition-[width,height] duration-200 ease-out ${
              isHovering ? "h-16 w-16 cursor-hovering" : "h-10 w-10"
            }`}
            style={{
              willChange: "transform",
              transform: "translate(-140px, -140px)",
              zIndex: 9999,
              opacity: loaded ? 1 : 0,
            }}
          />
        </>
      ) : null}

      <header
        onMouseMove={handleMouseMove}
        className={`fixed left-0 right-0 top-[2px] z-50 transition-all duration-300 ${
          scrollProgress > 2
            ? "border-b border-[#EAB308]/10 bg-[#0A0A0A]/80 shadow-lg shadow-black/20 backdrop-blur-md"
            : "bg-transparent"
        } ${!isMobile ? "cursor-none [&_*]:!cursor-none" : ""}`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:py-5">
          <div className="flex items-center gap-3">
            <Image src="/icons/i-down-remove.png" alt="Sapienta" width={32} height={32} />
            <span
              className="text-lg font-semibold tracking-[0.2em] text-white"
              style={{ fontFamily: "var(--font-landing-display)" }}
            >
              SAPIENTA
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/come-funziona"
              className="hidden items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-[#EAB308] sm:inline-flex"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <HelpCircle className="h-4 w-4" />
              Come Funziona
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#EAB308] px-5 py-2 text-sm font-semibold text-black shadow-[0_8px_25px_rgba(234,179,8,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#FACC15]"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Area Clienti
            </Link>
          </div>
        </div>
      </header>

      <main
        onMouseMove={handleMouseMove}
        className={`relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-white ${
          !isMobile ? "cursor-none [&_*]:!cursor-none" : ""
        }`}
      >
        <section
          ref={heroRef}
          className="relative flex min-h-screen items-center justify-center px-6 pb-14 pt-24 md:pb-20 md:pt-28"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(234,179,8,0.12),transparent_45%)]" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
            <button
              type="button"
              onClick={triggerLogoFlash}
              className="reveal-1 pointer-events-auto mb-8 inline-flex rounded-2xl p-2 focus:outline-none md:mb-10"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              aria-label="Sapienta logo"
            >
              <Image
                src="/icons/sapienta-remove.png"
                alt="Sapienta"
                width={130}
                height={130}
                className={`glow-pulse ${logoFlash ? "logo-flash" : ""}`}
                priority
              />
            </button>

            <p
              className="reveal-2 mb-3 text-sm uppercase tracking-[0.45em] text-[#EAB308]/95 md:text-base"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Portale Formazione
            </p>

            <h1
              className="reveal-3 text-5xl font-semibold leading-tight text-white md:text-7xl"
              style={{
                fontFamily: "var(--font-landing-display)",
                letterSpacing: "0.2em",
              }}
            >
              SAPIENTA
            </h1>

            <p
              className="reveal-4 mt-7 max-w-3xl text-lg leading-relaxed text-zinc-200 md:text-xl"
              style={{ fontFamily: "var(--font-body)" }}
            >
              La tua piattaforma di formazione aziendale. Gestisci corsi, dipendenti e attestati in
              un unico portale.
            </p>

            <Link
              href="/login"
              className="reveal-5 pointer-events-auto mt-11 inline-flex items-center gap-3 rounded-xl bg-[#EAB308] px-8 py-4 text-base font-bold text-black shadow-[0_12px_36px_rgba(234,179,8,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[#FACC15] md:text-lg"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Area Clienti
              <ArrowRight className="h-5 w-5" />
            </Link>

            <button
              type="button"
              className="bounce-down reveal-5 pointer-events-auto mt-14 inline-flex items-center gap-2 text-sm tracking-wide text-zinc-300 hover:text-white"
              onClick={scrollToNextSection}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              Scopri di più
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section
          id="stats-section"
          ref={servicesReveal.ref}
          className={`relative z-10 px-6 py-16 transition-all duration-700 md:py-24 ${
            servicesReveal.isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="mx-auto w-full max-w-6xl">
            <h2
              className="mb-5 text-center text-4xl text-white md:text-5xl"
              style={{ fontFamily: "var(--font-landing-display)" }}
            >
              Servizi Premium
            </h2>
            <p className="mx-auto mb-14 max-w-2xl text-center text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
              Un ecosistema completo per la formazione professionale aziendale.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              <TiltCard disabled={isMobile} onHoverChange={setIsHovering} className="shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <BookOpen className="mb-5 h-9 w-9 text-[#EAB308]" />
                <h3 className="mb-3 text-2xl font-semibold text-white">Gestione Corsi</h3>
                <p className="text-sm leading-relaxed text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                  Organizza edizioni, lezioni e presenze con un flusso operativo semplice e preciso.
                </p>
              </TiltCard>

              <TiltCard disabled={isMobile} onHoverChange={setIsHovering} className="shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <Users className="mb-5 h-9 w-9 text-[#EAB308]" />
                <h3 className="mb-3 text-2xl font-semibold text-white">Gestione Dipendenti</h3>
                <p className="text-sm leading-relaxed text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                  Centralizza le anagrafiche e collega ogni dipendente ai percorsi formativi corretti.
                </p>
              </TiltCard>

              <TiltCard disabled={isMobile} onHoverChange={setIsHovering} className="shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <Award className="mb-5 h-9 w-9 text-[#EAB308]" />
                <h3 className="mb-3 text-2xl font-semibold text-white">Attestati e Certificazioni</h3>
                <p className="text-sm leading-relaxed text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                  Certificati digitali sempre disponibili, tracciabili e pronti per il download.
                </p>
              </TiltCard>
            </div>
          </div>
        </section>

        <section
          ref={processReveal.ref}
          className={`relative z-10 px-6 py-16 transition-all duration-700 md:py-24 ${
            processReveal.isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="mx-auto w-full max-w-6xl">
            <h2
              className="mb-12 text-center text-4xl text-white md:text-5xl"
              style={{ fontFamily: "var(--font-landing-display)" }}
            >
              Come Funziona
            </h2>

            <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              <div
                className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[3.5rem] z-0 hidden h-[2px] origin-left bg-[#EAB308] transition-transform ease-out md:block"
                style={{
                  transform: processReveal.isVisible ? "scaleX(1)" : "scaleX(0)",
                  transitionDuration: "1500ms",
                }}
              />

              <div className="relative z-10 grid gap-6 md:col-span-3 md:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "Accedi al portale",
                    description: "Entra nell'area clienti con credenziali sicure e profilo dedicato.",
                  },
                  {
                    number: "02",
                    title: "Gestisci i tuoi corsi",
                    description: "Compila anagrafiche, controlla presenze e monitora ogni edizione.",
                  },
                  {
                    number: "03",
                    title: "Scarica gli attestati",
                    description: "Recupera certificazioni e storico in pochi click, sempre disponibili.",
                  },
                ].map((step) => (
                  <div key={step.number} className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.015] p-6 text-center md:px-6">
                    <div className="relative z-20 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#EAB308] bg-[#1A1A1A] text-xl font-semibold text-[#EAB308] shadow-[0_0_0_8px_#1A1A1A,0_0_22px_rgba(234,179,8,0.14)]">
                      {step.number}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-white">{step.title}</h3>
                    <p className="text-sm text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/come-funziona"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#EAB308] transition-colors hover:text-[#FACC15]"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                Scopri tutti i dettagli
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          ref={reasonsReveal.ref}
          className={`relative z-10 px-6 py-16 transition-all duration-700 md:py-20 ${
            reasonsReveal.isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-6 text-center">
              <Shield className="mx-auto mb-4 h-10 w-10 text-[#EAB308]" />
              <h3 className="mb-2 text-xl font-semibold text-white">Sicuro e Affidabile</h3>
              <p className="text-sm text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                Dati protetti e backup automatici giornalieri su infrastruttura affidabile.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-6 text-center">
              <Clock className="mx-auto mb-4 h-10 w-10 text-[#EAB308]" />
              <h3 className="mb-2 text-xl font-semibold text-white">Sempre Accessibile</h3>
              <p className="text-sm text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                Accedi da qualsiasi dispositivo, ovunque ti trovi, in qualunque momento.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.015] p-6 text-center">
              <Headphones className="mx-auto mb-4 h-10 w-10 text-[#EAB308]" />
              <h3 className="mb-2 text-xl font-semibold text-white">Supporto Dedicato</h3>
              <p className="text-sm text-zinc-300" style={{ fontFamily: "var(--font-body)" }}>
                Un team specializzato ti accompagna in ogni fase operativa.
              </p>
            </div>
          </div>
        </section>

        <section
          ref={ctaReveal.ref}
          className={`relative z-10 bg-gradient-to-b from-[#0A0A0A] via-[#111827] to-[#0A0A0A] px-6 py-16 transition-all duration-700 md:py-24 ${
            ctaReveal.isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-black/20 p-8 text-center md:p-12">
            <h2
              className="text-4xl text-white md:text-5xl"
              style={{ fontFamily: "var(--font-landing-display)" }}
            >
              Sei un nostro cliente?
            </h2>
            <p className="max-w-2xl text-zinc-200" style={{ fontFamily: "var(--font-body)" }}>
              Accedi al portale per gestire i tuoi corsi di formazione in modo rapido ed elegante.
            </p>
            <MagneticButton
              href="/login"
              isMobile={isMobile}
              onHoverChange={setIsHovering}
            >
              Accedi all&apos;Area Clienti
            </MagneticButton>
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/5 py-8">
          <div className="mx-auto w-full max-w-7xl px-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Image src="/icons/i-down-remove.png" alt="" width={20} height={20} />
              <span className="text-sm tracking-wider text-white/60">SAPIENTA</span>
            </div>
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} Sapienta - Ente di Formazione. Tutti i diritti riservati.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
