"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

type AiModel = {
  id: string;
  name: string;
  isFree: boolean;
  contextLength: number;
  pricingPrompt: string;
  pricingCompletion: string;
};

type LogEntry = {
  id: string;
  action: string;
  model: string;
  status: string;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  userName: string | null;
  teacherName: string | null;
  createdAt: string;
};

function formatCtx(ctx: number): string {
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(0)}M ctx`;
  if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K ctx`;
  return `${ctx} ctx`;
}

function formatPrice(prompt: string, completion: string): string {
  const p = parseFloat(prompt) * 1_000_000;
  const c = parseFloat(completion) * 1_000_000;
  if (p === 0 && c === 0) return "";
  return `$${p.toFixed(p < 1 ? 2 : 0)}/$${c.toFixed(c < 1 ? 2 : 0)}`;
}

export default function AiIntegrationsPage() {
  const { can, canAccess } = usePermissions();
  const queryClient = useQueryClient();
  const canEdit = can("integrazioni-ai", "edit");

  // Config state
  const [apiKey, setApiKey] = useState("");
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("meta-llama/llama-3.3-70b-instruct:free");
  const [modelName, setModelName] = useState("Llama 3.3 70B Instruct (Free)");
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    responseTime?: number;
  } | null>(null);

  // Models
  const [modelSearch, setModelSearch] = useState("");
  const [showModels, setShowModels] = useState(false);

  // Logs
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState("");

  // Fetch config
  const configQuery = useQuery({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-config");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (configQuery.data) {
      setModel(configQuery.data.model);
      setModelName(configQuery.data.modelName || "");
      setIsEnabled(configQuery.data.isEnabled);
      if (!apiKeyDirty) {
        setApiKey(configQuery.data.apiKeyMasked || "");
      }
    }
  }, [configQuery.data, apiKeyDirty]);

  // Fetch models
  const modelsQuery = useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-config/models");
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []) as AiModel[];
    },
    enabled: !!configQuery.data?.hasApiKey,
  });

  // Fetch logs
  const logsQuery = useQuery({
    queryKey: ["ai-logs", logPage, logFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(logPage), limit: "20" });
      if (logFilter) params.set("status", logFilter);
      const res = await fetch(`/api/admin/ai-config/logs?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyDirty ? apiKey : "",
          model,
          modelName,
          isEnabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Errore");
      }
      toast.success("Configurazione AI salvata");
      setApiKeyDirty(false);
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyDirty ? apiKey : "",
          model,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Errore di rete" });
    } finally {
      setTesting(false);
    }
  };

  const filteredModels = (modelsQuery.data || []).filter((m: AiModel) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );
  const freeModels = filteredModels.filter((m: AiModel) => m.isFree);
  const paidModels = filteredModels.filter((m: AiModel) => !m.isFree);

  if (!canAccess("integrazioni-ai")) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Accesso non consentito</p>
      </div>
    );
  }

  const stats = logsQuery.data?.stats;
  const logs = (logsQuery.data?.logs || []) as LogEntry[];
  const logTotal = logsQuery.data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Integrazioni AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura i servizi di intelligenza artificiale del portale.
        </p>
      </div>

      {/* Config Section */}
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold">Configurazione OpenRouter</h2>

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Stato</p>
            <p className="text-xs text-muted-foreground">
              {isEnabled ? "Le funzionalita AI sono attive" : "Le funzionalita AI sono disabilitate"}
            </p>
          </div>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              isEnabled ? "bg-emerald-500" : "bg-gray-300"
            } ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* API Key */}
        <div>
          <label className="text-sm font-medium block mb-1">
            Chiave API <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setApiKeyDirty(true);
              }}
              placeholder="sk-or-v1-..."
              disabled={!canEdit}
              className="w-full rounded-md border px-3 py-2 text-sm pr-10 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
          >
            Ottieni una chiave su openrouter.ai/keys
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Model Selector */}
        <div>
          <label className="text-sm font-medium block mb-1">
            Modello <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModels(!showModels)}
              disabled={!canEdit}
              className="w-full rounded-md border px-3 py-2 text-sm text-left flex items-center justify-between disabled:opacity-50"
            >
              <span className="truncate">{modelName || model}</span>
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {showModels && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-80 overflow-hidden flex flex-col">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Cerca modello..."
                    className="w-full rounded-md border px-3 py-1.5 text-sm"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {modelsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !configQuery.data?.hasApiKey ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">
                      Inserisci prima la chiave API per caricare i modelli disponibili
                    </p>
                  ) : filteredModels.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">
                      Nessun modello trovato
                    </p>
                  ) : (
                    <>
                      {freeModels.length > 0 && (
                        <>
                          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            Modelli gratuiti
                          </p>
                          {freeModels.map((m: AiModel) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setModel(m.id);
                                setModelName(m.name);
                                setShowModels(false);
                                setModelSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between ${
                                model === m.id ? "bg-amber-50" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {model === m.id ? (
                                  <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                ) : (
                                  <span className="w-3.5" />
                                )}
                                <span className="truncate">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatCtx(m.contextLength)}
                                </span>
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  Gratis
                                </span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                      {paidModels.length > 0 && (
                        <>
                          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            Modelli a pagamento
                          </p>
                          {paidModels.slice(0, 30).map((m: AiModel) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setModel(m.id);
                                setModelName(m.name);
                                setShowModels(false);
                                setModelSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between ${
                                model === m.id ? "bg-amber-50" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {model === m.id ? (
                                  <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                ) : (
                                  <span className="w-3.5" />
                                )}
                                <span className="truncate">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatCtx(m.contextLength)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPrice(m.pricingPrompt, m.pricingCompletion)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !canEdit}
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Testa connessione
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canEdit}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salva
          </button>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`rounded-md p-3 text-sm flex items-center gap-2 ${
              testResult.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {testResult.message}
            {testResult.responseTime != null && (
              <span className="ml-1 text-xs opacity-70">
                ({(testResult.responseTime / 1000).toFixed(1)}s)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Features section */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold">Funzionalita AI</h2>
        <div className="rounded-md border p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Import CV da PDF</p>
            <p className="text-xs text-muted-foreground">
              Analizza automaticamente i CV dei docenti caricati in PDF ed estrae i dati strutturati nelle 8 sezioni del curriculum.
            </p>
            <p className="mt-1">
              {configQuery.data?.hasApiKey && configQuery.data?.isEnabled ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle2 className="h-3 w-3" /> Disponibile
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" /> Non configurato
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Logs section */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Log Chiamate AI</h2>

        {/* Stats */}
        {stats && stats.totalCalls > 0 && (
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="font-medium">{stats.totalCalls}</span> chiamate totali
            </span>
            <span className="text-green-600">
              {stats.successCount} successi
            </span>
            <span className="text-red-600">{stats.errorCount} errori</span>
            {stats.avgDurationMs > 0 && (
              <span className="text-muted-foreground">
                Tempo medio: {(stats.avgDurationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          <select
            value={logFilter}
            onChange={(e) => {
              setLogFilter(e.target.value);
              setLogPage(1);
            }}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="">Tutti</option>
            <option value="success">Successi</option>
            <option value="error">Errori</option>
          </select>
        </div>

        {/* Table */}
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nessuna chiamata AI registrata.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Azione</th>
                  <th className="pb-2 pr-3 font-medium">Stato</th>
                  <th className="pb-2 pr-3 font-medium">Durata</th>
                  <th className="pb-2 font-medium">Token</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: LogEntry) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <p>{new Date(log.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="py-2 pr-3">
                      <p>Import CV</p>
                      {log.teacherName && (
                        <p className="text-xs text-muted-foreground">{log.teacherName}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {log.errorMessage && (
                        <p className="text-xs text-red-500 mt-0.5 max-w-48 truncate">
                          {log.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                      {log.durationMs != null
                        ? `${(log.durationMs / 1000).toFixed(1)}s`
                        : "-"}
                    </td>
                    <td className="py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {log.inputTokens != null && log.outputTokens != null
                        ? `${log.inputTokens}/${log.outputTokens}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logTotal > 20 && (
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              disabled={logPage <= 1}
              onClick={() => setLogPage((p) => p - 1)}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              Precedente
            </button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              Pagina {logPage} di {Math.ceil(logTotal / 20)}
            </span>
            <button
              type="button"
              disabled={logPage >= Math.ceil(logTotal / 20)}
              onClick={() => setLogPage((p) => p + 1)}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              Successiva
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
