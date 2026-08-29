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

export function WorkflowStudio() {
  const [templateId, setTemplateId] = useState(WORKFLOW_TEMPLATES[0].id);
  const [config, setConfig] = useState<Record<string, string>>({ ...DEFAULT_CONFIG });
  const [payload, setPayload] = useState(WORKFLOW_TEMPLATES[0].samplePayload);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<RunEvent[]>([]);
  const [history, setHistory] = useState<RunSession[]>([]);
  const [connected, setConnected] = useState(false);

  const template = useMemo(
    () => WORKFLOW_TEMPLATES.find((t) => t.id === templateId) ?? WORKFLOW_TEMPLATES[0],
    [templateId]
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
    [socket]
  );

  useEffect(() => {
    setSelectedStepId(template.steps[0]?.id ?? null);
  }, [template]);

  const selectTemplate = (t: WorkflowTemplate) => {
    setTemplateId(t.id);
    setPayload(t.samplePayload);
  };

  const runWorkflow = async () => {
    if (running) return;
    const sessionId = crypto.randomUUID();
    const sessionEvents: RunEvent[] = [];
    setRunning(true);
    setActiveStep(null);

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
      const done = broadcast(step.label, "done", {
        durationMs: Date.now() - t0,
        output: mockStepOutput(step.id, payload),
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
    <div className="min-h-screen pt-14">
      <PortfolioBar />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.35em] text-[#39ff14]/50 uppercase">
                Partykit · Live Runs
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#39ff14]">FlowForge</h1>
              <p className="mt-1 text-sm text-[#39ff14]/40">
                Orquestación de workflows IA — plantillas, payload y config por paso
              </p>
            </div>
            <button
              onClick={runWorkflow}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-lg border border-[#39ff14]/40 bg-[#39ff14]/10 px-5 py-2.5 text-sm font-semibold text-[#39ff14] transition hover:bg-[#39ff14]/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#39ff14]"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {running ? "Ejecutando…" : "Run Workflow"}
            </button>
          </div>

          <section className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a] p-4">
            <p className="mb-3 text-[10px] tracking-widest text-[#39ff14]/40 uppercase">
              Templates
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {WORKFLOW_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTemplate(t)}
                  className={`rounded-lg border p-3 text-left transition ${
                    t.id === templateId
                      ? "border-[#39ff14]/50 bg-[#39ff14]/10"
                      : "border-[#39ff14]/10 bg-[#050805] hover:border-[#39ff14]/25"
                  }`}
                >
                  <p className="text-xs font-semibold text-[#39ff14]">{t.name}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#39ff14]/45">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {template.steps.map((step, i) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border text-xl transition-all ${
                      activeStep === i
                        ? "border-[#39ff14] bg-[#39ff14]/15 shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                        : selectedStepId === step.id
                          ? "border-[#39ff14]/50 bg-[#39ff14]/8"
                          : activeStep !== null && i < activeStep
                            ? "border-[#39ff14]/40 bg-[#39ff14]/5"
                            : "border-[#39ff14]/10 bg-[#050805]"
                    }`}
                  >
                    {activeStep !== null && i < activeStep ? (
                      <CheckCircle2 className="h-5 w-5 text-[#39ff14]" aria-hidden="true" />
                    ) : activeStep === i ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#39ff14]" aria-hidden="true" />
                    ) : (
                      <span role="img" aria-hidden="true">
                        {step.icon}
                      </span>
                    )}
                  </div>
                  {i < template.steps.length - 1 && (
                    <div
                      className={`hidden h-px flex-1 md:block ${
                        activeStep !== null && i < activeStep
                          ? "bg-[#39ff14]/60"
                          : "bg-[#39ff14]/10"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {template.steps.map((step) => (
                <p key={step.id} className="text-center text-[10px] text-[#39ff14]/50">
                  {step.label}
                </p>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#39ff14]/60">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                <span className="text-[10px] tracking-widest uppercase">
                  Step config · {selectedStep.label}
                </span>
              </div>
              <label className="text-[10px] text-[#39ff14]/40">{selectedStep.configKey}</label>
              <input
                value={config[selectedStep.configKey] ?? ""}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, [selectedStep.configKey]: e.target.value }))
                }
                className="mt-1 w-full rounded border border-[#39ff14]/20 bg-[#050805] px-3 py-2 text-xs text-[#39ff14] outline-none focus:border-[#39ff14]/50"
              />
            </section>

            <section className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a] p-4">
              <p className="mb-2 text-[10px] tracking-widest text-[#39ff14]/40 uppercase">
                Test payload (JSON)
              </p>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={4}
                className="w-full resize-none rounded border border-[#39ff14]/20 bg-[#050805] px-3 py-2 font-mono text-[11px] text-[#39ff14]/80 outline-none focus:border-[#39ff14]/50"
              />
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Zap, label: "Triggers", value: "Webhook · Cron · Email" },
              { icon: Bot, label: "AI Steps", value: "Gemini · Tool Calling" },
              { icon: Radio, label: "Status", value: connected ? "Live · Connected" : "Connecting…" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[#39ff14]/10 bg-[#0a120a] p-4"
              >
                <item.icon className="mb-2 h-4 w-4 text-[#39ff14]/60" aria-hidden="true" />
                <p className="text-[10px] tracking-widest text-[#39ff14]/40 uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-[#39ff14]/70">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a]">
            <div className="flex items-center justify-between border-b border-[#39ff14]/10 px-4 py-3">
              <span className="text-[10px] tracking-widest text-[#39ff14]/50 uppercase">
                Live Run Log
              </span>
              <Radio
                className={`h-3 w-3 ${connected ? "text-[#39ff14]" : "text-red-400"}`}
                aria-hidden="true"
              />
            </div>
            <div className="max-h-[280px] space-y-2 overflow-y-auto p-3">
              {runs.length === 0 ? (
                <p className="text-[10px] text-[#39ff14]/30">
                  Ejecuta un workflow para ver eventos en vivo…
                </p>
              ) : (
                runs
                  .slice()
                  .reverse()
                  .map((run) => (
                    <div
                      key={`${run.id}-${run.ts}`}
                      className="rounded border border-[#39ff14]/10 bg-[#050805] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#39ff14]/60">{run.user}</span>
                        <span
                          className={`text-[9px] uppercase ${
                            run.status === "done" || run.status === "complete"
                              ? "text-[#39ff14]"
                              : run.status === "running"
                                ? "text-yellow-400"
                                : "text-[#39ff14]/40"
                          }`}
                        >
                          {run.status}
                          {run.durationMs ? ` · ${run.durationMs}ms` : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#39ff14]/80">{run.step}</p>
                      {run.output && (
                        <p className="mt-1 truncate font-mono text-[9px] text-[#39ff14]/35">
                          {run.output}
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a]">
            <div className="flex items-center gap-2 border-b border-[#39ff14]/10 px-4 py-3">
              <Clock className="h-3.5 w-3.5 text-[#39ff14]/50" aria-hidden="true" />
              <span className="text-[10px] tracking-widest text-[#39ff14]/50 uppercase">
                Run History
              </span>
            </div>
            <div className="max-h-[220px] space-y-2 overflow-y-auto p-3">
              {history.length === 0 ? (
                <p className="text-[10px] text-[#39ff14]/30">Sin ejecuciones previas</p>
              ) : (
                history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded border border-[#39ff14]/10 bg-[#050805] px-3 py-2"
                  >
                    <p className="text-xs font-medium text-[#39ff14]/80">
                      {WORKFLOW_TEMPLATES.find((t) => t.id === h.templateId)?.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-[#39ff14]/35">
                      {h.payload.slice(0, 60)}…
                    </p>
                    {h.finishedAt && (
                      <p className="mt-1 text-[9px] text-[#39ff14]/40">
                        {h.finishedAt - h.startedAt}ms total
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function mockStepOutput(stepId: string, payload: string): string {
  try {
    const p = JSON.parse(payload);
    if (stepId === "ai") return `enriched: ${JSON.stringify({ ...p, score: 0.87 })}`;
    if (stepId === "transform") return `mapped → CRM record #${Math.floor(Math.random() * 9000 + 1000)}`;
    if (stepId === "notify") return `delivered · ack id wf_${Date.now().toString(36)}`;
    return `received ${Object.keys(p).length} fields`;
  } catch {
    return "payload parsed (mock)";
  }
}
