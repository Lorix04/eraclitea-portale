"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Suspense } from "react";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type InviteInfo = {
  clientName: string;
  email: string;
  expiresAt: string;
  status: string;
};

function InviteClientContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError("Token mancante. Controlla il link ricevuto via email.");
      setLoading(false);
      return;
    }

    fetch(`/api/clienti/utenti/invite-info?token=${token}`)
      .then((res) => {
        if (!res.ok) return res.json().then((j) => Promise.reject(j));
        return res.json();
      })
      .then((data) => {
        setInviteInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.error || "Invito non valido o scaduto.");
        setLoading(false);
      });
  }, [token]);

  // If not logged in, redirect to login with return URL
  useEffect(() => {
    if (sessionStatus === "unauthenticated" && !loading && inviteInfo) {
      const returnUrl = `/invito-client?token=${token}`;
      signIn(undefined, { callbackUrl: returnUrl });
    }
  }, [sessionStatus, loading, inviteInfo, token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/clienti/utenti/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore durante l'accettazione dell'invito.");
        setAccepting(false);
        return;
      }

      setAccepted(true);
      setTimeout(() => {
        router.push(data.redirectTo || "/");
      }, 2000);
    } catch {
      setError("Errore di rete. Riprova.");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-3 text-sm text-gray-500">Verifica invito...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">Invito non valido</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Vai al login
          </a>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">Invito accettato!</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ora hai accesso a <strong>{inviteInfo?.clientName}</strong>. Reindirizzamento...
          </p>
        </div>
      </div>
    );
  }

  if (sessionStatus === "loading" || sessionStatus === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-3 text-sm text-gray-500">Reindirizzamento al login...</p>
        </div>
      </div>
    );
  }

  // Logged in — check email match
  const emailMismatch =
    session?.user?.email?.toLowerCase() !== inviteInfo?.email?.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-center text-lg font-semibold text-gray-900">
          Invito amministratore
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sei stato invitato come amministratore di:
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-base font-semibold text-gray-900">{inviteInfo?.clientName}</p>
        </div>

        {emailMismatch ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">
              Questo invito e destinato a <strong>{inviteInfo?.email}</strong>.
              Sei attualmente loggato come <strong>{session?.user?.email}</strong>.
              Accedi con l&apos;account corretto per accettare l&apos;invito.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting || emailMismatch}
            className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {accepting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Accettazione...
              </span>
            ) : (
              "Accetta invito"
            )}
          </button>
          <a
            href="/"
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-center text-sm text-gray-700 hover:bg-gray-50"
          >
            Torna alla home
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Scadenza invito:{" "}
          {inviteInfo?.expiresAt
            ? new Date(inviteInfo.expiresAt).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "-"}
        </p>
      </div>
    </div>
  );
}

export default function InvitoClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <InviteClientContent />
    </Suspense>
  );
}
