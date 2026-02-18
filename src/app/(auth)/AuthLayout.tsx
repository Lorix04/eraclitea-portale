"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type AuthLayoutProps = {
  children: React.ReactNode;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const count = 25;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    let animationId = 0;
    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
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
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setFormVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0A]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.03)_0%,transparent_60%)]" />

      <div
        className={`relative z-10 w-full max-w-md px-6 transition-all duration-700 ease-out ${
          formVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/icons/sapienta-remove.png"
              alt="Sapienta"
              width={80}
              height={80}
              className="glow-pulse mx-auto mb-4"
            />
          </Link>
          <h1
            className="text-2xl font-bold tracking-[0.15em] text-white"
            style={{ fontFamily: "var(--font-landing-display, var(--font-display))" }}
          >
            SAPIENTA
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-8 shadow-2xl shadow-black/50">
          {children}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-white/40 transition-colors hover:text-[#EAB308]"
          >
            &larr; Torna alla Home
          </Link>
        </div>
      </div>
    </div>
  );
}

