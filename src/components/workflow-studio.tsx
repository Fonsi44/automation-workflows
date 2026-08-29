"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import usePartySocket from "partysocket/react";
import {
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Radio,
  Settings2,
  Zap,
} from "lucide-react";
import { PortfolioBar } from "@/components/portfolio-bar";
import { PARTY_HOST } from "@/lib/party-config";
import {
  DEFAULT_CONFIG,
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
} from "@/lib/workflow-templates";

type RunEvent = {
  id: string;
  user: string;
  step: string;
  status: string;
  ts: number;
  durationMs?: number;
  output?: string;
};

type RunSession = {
  id: string;
  templateId: string;
  startedAt: number;
  finishedAt?: number;
  events: RunEvent[];
  payload: string;
};

type StudioTab = "workflow" | "runs";

export function WorkflowStudio() {
  const [tab, setTab] = useState<StudioTab>("workflow");
  const [templateId, setTemplateId] = useState(WORKFLOW_TEMPLATES[0].id);
  const [config, setConfig] = useState<Record<string, string>>({ ...DEFAULT_CONFIG });
  const [payload, setPayload] = useState(WORKFLOW_TEMPLATES[0].samplePayload);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<RunEvent[]>([]);
  const [history, setHistory] = useState<RunSession[]>([]);
  const [connected, setConnected] = useState(false);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const template = useMemo(
    () => WORKFLOW_TEMPLATES.find((t) => t.id === templateId) ?? WORKFLOW_TEMPLATES[0],
    [templateId],
  );

  const selectedStep = template.steps.find((s) => s.id === selectedStepId) ?? template.steps[0];

  const socket = usePartySocket({
    host: PARTY_HOST,
    room: "automation",
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onMessage: (evt) => {
      try {
        const data = JSON.parse(String(evt.data));
        if (data.type === "workflow-run") {
          setRuns((prev) => [...prev.slice(-40), data.run]);
        }
      } catch {
        /* ignore */
      }
    },
  });

  const broadcast = useCallback(
    (step: string, status: string, extra?: Partial<RunEvent>) => {
      const run: RunEvent = {
        id: crypto.randomUUID(),
        user: "You",
        step,
        status,
        ts: Date.now(),
        ...extra,
      };
      socket.send(JSON.stringify({ type: "workflow-run", run }));
      setRuns((prev) => [...prev.slice(-40), run]);
      return run;
    },
    [socket],
  );

  useEffect(() => {
    setSelectedStepId(template.steps[0]?.id ?? null);
  }, [template]);

  const validatePayload = (raw: string) => {
    try {
      JSON.parse(raw);
      setPayloadError(null);
      return true;
    } catch (e) {
      setPayloadError(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  };

  const selectTemplate = (t: WorkflowTemplate) => {
    setTemplateId(t.id);
    setPayload(t.samplePayload);
  };

  const runWorkflow = async () => {
    if (running || !validatePayload(payload)) return;
    const sessionId = crypto.randomUUID();
    const sessionEvents: RunEvent[] = [];
    setRunning(true);
    setActiveStep(null);
    setTab("runs");

    const startRun = broadcast(`${template.name}`, "started", {
      output: payload.slice(0, 120),
    });
    sessionEvents.push(startRun);

    for (let i = 0; i < template.steps.length; i++) {
      const step = template.steps[i];
      setActiveStep(i);
      const t0 = Date.now();
      broadcast(step.label, "running", {
        output: config[step.configKey] ?? "",
      });
      await new Promise((r) => setTimeout(r, step.ms));

      if (simulateFailure && i === 1) {
        const fail = broadcast(step.label, "failed", {
          durationMs: Date.now() - t0,
          output: "Simulated error: upstream timeout (503)",
        });
        sessionEvents.push(fail);
        broadcast("workflow", "failed");
        setActiveStep(null);
        setRunning(false);
        setHistory((prev) => [
          {
            id: sessionId,
            templateId: template.id,
            startedAt: Date.now() - template.steps.slice(0, i + 1).reduce((a, s) => a + s.ms, 0),
            finishedAt: Date.now(),
            events: sessionEvents,
            payload,
          },
          ...prev.slice(0, 9),
        ]);
        return;
      }

      const stepOutput =
        step.id === "ai" ? await fetchEnrichOutput(payload) : mockStepOutput(step.id, payload);

      const done = broadcast(step.label, "done", {
        durationMs: Date.now() - t0,
        output: stepOutput,
      });
      sessionEvents.push(done);
    }

    setActiveStep(null);
    broadcast("workflow", "complete", { durationMs: template.steps.reduce((a, s) => a + s.ms, 0) });
    setRunning(false);

    setHistory((prev) => [
      {
        id: sessionId,
        templateId: template.id,
        startedAt: Date.now() - template.steps.reduce((a, s) => a + s.ms, 0),
        finishedAt: Date.now(),
        events: sessionEvents,
        payload,
      },
      ...prev.slice(0, 9),
    ]);
  };

  return (
    <div className="min-h-screen pt-[57px]">
      <PortfolioBar />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.35em] text-cyan-400/70 uppercase">
              Partykit · Live Runs
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">FlowForge</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Orquestación de workflows IA — plantillas, payload y config por paso
            </p>
          </div>
          <button
            onClick={runWorkflow}
            disabled={running || !!payloadError}
            title="⌘+Enter to run"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:from-cyan-300 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {running ? "Ejecutando…" : "Run Workflow"}
          </button>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl border border-white/8 bg-zinc-950/60 p-1">
          {(
            [
              { id: "workflow" as const, label: "Workflow" },
              { id: "runs" as const, label: "Runs" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-cyan-500/10 text-cyan-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "workflow" ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-5">
              <p className="mb-3 font-mono text-xs tracking-widest text-zinc-500 uppercase">
                Templates
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {WORKFLOW_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t)}
                    className={`rounded-xl border p-3 text-left transition ${
                      t.id === templateId
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-white/8 bg-zinc-950/40 hover:border-cyan-500/20"
                    }`}
                  >
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-6">
              <p className="mb-4 font-mono text-xs tracking-widest text-zinc-500 uppercase">
                Pipeline
              </p>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {template.steps.map((step, i) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setSelectedStepId(step.id)}
                    title={step.label}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border transition-all ${
                        activeStep === i
                          ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                          : selectedStepId === step.id
                            ? "border-cyan-500/40 bg-cyan-500/8"
                            : activeStep !== null && i < activeStep
                              ? "border-cyan-500/30 bg-cyan-500/5"
                              : "border-white/8 bg-zinc-950/60"
                      }`}
                    >
                      {activeStep !== null && i < activeStep ? (
                        <CheckCircle2 className="h-5 w-5 text-cyan-400" aria-hidden="true" />
                      ) : activeStep === i ? (
                        <Loader2
                          className="h-5 w-5 animate-spin text-cyan-400"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-lg" role="img" aria-hidden="true">
                          {step.icon}
                        </span>
                      )}
                      <span className="mt-0.5 max-w-[52px] truncate text-[9px] text-zinc-500">
                        {step.label}
                      </span>
                    </div>
                    {i < template.steps.length - 1 && (
                      <div
                        className={`hidden h-px flex-1 md:block ${
                          activeStep !== null && i < activeStep ? "bg-cyan-500/40" : "bg-white/8"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-zinc-400">
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  <span className="font-mono text-xs tracking-widest uppercase">
                    Step config · {selectedStep.label}
                  </span>
                </div>
                <label className="text-xs text-zinc-500">{selectedStep.configKey}</label>
                <input
                  value={config[selectedStep.configKey] ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, [selectedStep.configKey]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500/50"
                />
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {selectedStep.description}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] text-zinc-500">
                  <div>
                    <span className="text-zinc-600">IN</span> {selectedStep.inputSchema}
                  </div>
                  <div>
                    <span className="text-zinc-600">OUT</span> {selectedStep.outputSchema}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/8 bg-zinc-950/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
                    Test payload (JSON)
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setPayload(JSON.stringify(JSON.parse(payload), null, 2));
                        setPayloadError(null);
                      } catch {
                        /* keep error */
                      }
                    }}
                    className="font-mono text-[10px] text-zinc-500 hover:text-cyan-400"
                  >
                    Format
                  </button>
                </div>
                <textarea
                  value={payload}
                  onChange={(e) => {
                    setPayload(e.target.value);
                    validatePayload(e.target.value);
                  }}
                  rows={4}
                  className={`w-full resize-none rounded-lg border bg-zinc-950 px-3 py-2 font-mono text-xs text-cyan-200/80 outline-none focus:border-cyan-500/50 ${
                    payloadError ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {payloadError && (
                  <p className="mt-1 font-mono text-[10px] text-red-400">{payloadError}</p>
                )}
                <label className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="rounded"
                  />
                  Simulate failure at step 2
                </label>
              </section>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, label: "Triggers", value: "Webhook · Cron · Email" },
                { icon: Bot, label: "AI Steps", value: "Gemini · Tool Calling" },
                {
                  icon: Radio,
                  label: "Status",
                  value: connected ? "Live · Connected" : "Connecting…",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/8 bg-zinc-950/60 p-4"
                >
                  <item.icon className="mb-2 h-4 w-4 text-cyan-400/70" aria-hidden="true" />
                  <p className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/8 bg-zinc-950/60">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
                  Live Run Log
                </span>
                <Radio
                  className={`h-3.5 w-3.5 ${connected ? "text-cyan-400" : "text-red-400"}`}
                  aria-hidden="true"
                />
              </div>
              <div className="max-h-[360px] space-y-2 overflow-y-auto p-4">
                {runs.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Ejecuta un workflow para ver eventos en vivo…
                  </p>
                ) : (
                  runs
                    .slice()
                    .reverse()
                    .map((run) => (
                      <div
                        key={`${run.id}-${run.ts}`}
                        className="rounded-lg border border-white/8 bg-zinc-950/80 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-zinc-500">{run.user}</span>
                          <span
                            className={`font-mono text-[10px] uppercase ${
                              run.status === "done" || run.status === "complete"
                                ? "text-cyan-400"
                                : run.status === "running"
                                  ? "text-amber-400"
                                  : run.status === "failed"
                                    ? "text-red-400"
                                    : "text-zinc-500"
                            }`}
                          >
                            {run.status}
                            {run.durationMs ? ` · ${run.durationMs}ms` : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-zinc-200">{run.step}</p>
                        {run.output && (
                          <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                            {run.output}
                          </p>
                        )}
                      </div>
                    ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/8 bg-zinc-950/60">
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                <Clock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
                <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
                  Run History
                </span>
              </div>
              <div className="max-h-[320px] space-y-2 overflow-y-auto p-4">
                {history.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin ejecuciones previas</p>
                ) : (
                  history.map((h) => (
                    <div key={h.id} className="rounded-lg border border-white/8 bg-zinc-950/80">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedHistoryId(expandedHistoryId === h.id ? null : h.id)
                        }
                        className="w-full px-3 py-2 text-left"
                      >
                        <p className="text-sm font-medium text-zinc-200">
                          {WORKFLOW_TEMPLATES.find((t) => t.id === h.templateId)?.name}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                          {h.payload.slice(0, 80)}…
                        </p>
                        {h.finishedAt && (
                          <p className="mt-1 font-mono text-[10px] text-zinc-600">
                            {h.finishedAt - h.startedAt}ms total · {h.events.length} events
                          </p>
                        )}
                      </button>
                      {expandedHistoryId === h.id && (
                        <div className="space-y-1 border-t border-white/8 px-3 py-2">
                          {h.events.map((ev) => (
                            <div key={ev.id} className="font-mono text-[10px] text-zinc-500">
                              {ev.step} · {ev.status}
                              {ev.output && (
                                <span className="block truncate text-zinc-600">{ev.output}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function mockStepOutput(stepId: string, payload: string): string {
  try {
    const p = JSON.parse(payload);
    if (stepId === "transform")
      return `mapped → CRM record #${Math.floor(Math.random() * 9000 + 1000)}`;
    if (stepId === "notify") return `delivered · ack id wf_${Date.now().toString(36)}`;
    return `received ${Object.keys(p).length} fields`;
  } catch {
    return "payload parsed (mock)";
  }
}

async function fetchEnrichOutput(payload: string): Promise<string> {
  try {
    const res = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return `enrich error: ${String(data.error ?? res.statusText)}`;
    }
    if (data.fallback) {
      const { fallback: _, message, ...enriched } = data;
      return `[fallback] ${String(message)} · ${JSON.stringify(enriched)}`;
    }
    const model = data.model ? `[${data.model}] ` : "";
    const { model: _m, ...enriched } = data;
    return `${model}${JSON.stringify(enriched)}`;
  } catch (error) {
    return `enrich error: ${error instanceof Error ? error.message : "unknown"}`;
  }
}
