"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Check = { label: string; met: boolean };

function getChecks(password: string): Check[] {
  return [
    { label: "Almeno 8 caratteri", met: password.length >= 8 },
    { label: "Una lettera maiuscola", met: /[A-Z]/.test(password) },
    { label: "Una lettera minuscola", met: /[a-z]/.test(password) },
    { label: "Un numero", met: /[0-9]/.test(password) },
  ];
}

function getStrength(checks: Check[]): number {
  return checks.filter((c) => c.met).length;
}

export function isPasswordValid(password: string): boolean {
  return getChecks(password).every((c) => c.met);
}

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showConfirmMatch?: boolean;
}

export default function PasswordRequirements({
  password,
  confirmPassword,
  showConfirmMatch,
}: PasswordRequirementsProps) {
  const checks = useMemo(() => getChecks(password), [password]);
  const strength = useMemo(() => getStrength(checks), [checks]);
  const allMet = strength === checks.length;

  if (!password) return null;

  const strengthLabel =
    strength <= 1
      ? "Debole"
      : strength <= 2
        ? "Scarsa"
        : strength <= 3
          ? "Media"
          : "Forte";

  const strengthColor =
    strength <= 1
      ? "bg-red-500"
      : strength <= 2
        ? "bg-orange-400"
        : strength <= 3
          ? "bg-amber-400"
          : "bg-emerald-500";

  const strengthTextColor =
    strength <= 2
      ? "text-red-600 dark:text-red-400"
      : strength <= 3
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="mt-2 space-y-2">
      {/* Requirements checklist */}
      <div className="space-y-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-2 text-sm transition-colors duration-200"
          >
            {check.met ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
            )}
            <span
              className={
                check.met
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i < strength ? strengthColor : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${strengthTextColor}`}>
          {strengthLabel}
        </span>
      </div>

      {/* Confirm password match */}
      {showConfirmMatch &&
      confirmPassword !== undefined &&
      confirmPassword.length > 0 ? (
        <div className="flex items-center gap-2 text-sm transition-colors duration-200">
          {password === confirmPassword ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">
                Le password coincidono
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span className="text-red-500 dark:text-red-400">
                Le password non coincidono
              </span>
            </>
          )}
        </div>
      ) : null}

      {/* Submission readiness */}
      {allMet &&
      showConfirmMatch &&
      confirmPassword !== undefined &&
      confirmPassword.length > 0 &&
      password === confirmPassword ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Pronto per il salvataggio
        </p>
      ) : null}
    </div>
  );
}
