"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";
import DocumentSigningForm from "@/components/teacher/DocumentSigningForm";

type TeacherData = {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  city: string;
};

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeacher() {
      if (!session?.user?.teacherId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/teacher/profile");
        if (!res.ok) {
          setError("Errore nel caricamento dei dati");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTeacher(data);
      } catch {
        setError("Errore di connessione");
      } finally {
        setLoading(false);
      }
    }

    loadTeacher();
  }, [session?.user?.teacherId]);

  const handleComplete = async () => {
    // Update session to reflect new status
    await updateSession({ teacherStatus: "ACTIVE" });
    router.replace("/docente");
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#EAB308]" />
          <p className="mt-4 text-sm text-gray-500">Caricamento...</p>
        </div>
      </Shell>
    );
  }

  if (error || !teacher) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Errore</h2>
          <p className="text-sm text-gray-500">
            {error || "Impossibile caricare i dati del docente."}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 text-center">
        <h2
          className="text-xl font-semibold text-gray-900"
          style={{
            fontFamily: "var(--font-landing-display, var(--font-display))",
          }}
        >
          Completa la tua registrazione
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Benvenuto, {teacher.firstName}! Per attivare il tuo account devi
          firmare la Dichiarazione sostitutiva dell&apos;atto di notorieta.
        </p>
      </div>

      <DocumentSigningForm teacher={teacher} onComplete={handleComplete} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Image
          src="/icons/sapienta-remove.png"
          alt="Sapienta"
          width={180}
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>
      <div className="w-full max-w-3xl">
        {children}
      </div>
      <p className="mt-8 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Accademia Eraclitea — Portale Sapienta
      </p>
    </div>
  );
}
