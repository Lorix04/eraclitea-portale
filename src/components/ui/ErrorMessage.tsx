import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Si e verificato un errore</p>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              <RotateCcw className="h-4 w-4" />
              Riprova
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
