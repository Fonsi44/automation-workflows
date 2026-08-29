"use client";

import usePartySocket from "partysocket/react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Play,
  Radio,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { PARTY_HOST, randomName, WORKFLOW_STEPS } from "@/lib/party-config";
import { PortfolioBar } from "./portfolio-bar";

type RunEvent = {
  id: string;
  user: string;
  step: string;
  status: "running" | "done" | "started" | "complete";
  ts: number;
};

export function WorkflowStudio() {
  const [operator] = useState(randomName);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [runs, setRuns] = useState<RunEvent[]>([]);

  const socket = usePartySocket({
    host: PARTY_HOST,
    room: "automation",
    onOpen() {
      setConnected(true);
    },
    onClose() {
      setConnected(false);
    },
    onMessage(evt) {
      const data = JSON.parse(evt.data);
      if (data.type === "run-sync") {
        setRuns(data.runs.slice(-30));
      }
      if (data.type === "run-event") {
        setRuns((prev) => [...prev.slice(-29), data.event]);
      }
    },
  });

  usePartySocket({
    host: PARTY_HOST,
    room: "ecosystem",
    onOpen(evt) {
      const ws = evt.target as WebSocket;
      ws.send(
        JSON.stringify({
          type: "ecosystem-join",
          name: operator,
          color: "#39ff14",
          app: "automation",
        }),
      );
    },
  });

  const broadcast = useCallback(
    (step: string, status: RunEvent["status"]) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(
        JSON.stringify({
          type: "run-step",
          user: operator,
          step,
          status,
        }),
      );
    },
    [socket, operator],
  );

  const runWorkflow = async () => {
    if (running) return;
    setRunning(true);
    setActiveStep(null);
    broadcast("workflow", "started");

    for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
      const step = WORKFLOW_STEPS[i];
      setActiveStep(i);
      broadcast(step.label, "running");
      await new Promise((r) => setTimeout(r, step.ms));
      broadcast(step.label, "done");
    }

    setActiveStep(null);
    broadcast("workflow", "complete");
    setRunning(false);
  };

  return (
    <div className="min-h-screen pt-14">
      <PortfolioBar />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.35em] text-[#39ff14]/50 uppercase">
                Partykit · Live Runs
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#39ff14]">FlowForge</h1>
              <p className="mt-1 text-sm text-[#39ff14]/40">
                Orquestación de workflows IA con ejecución en tiempo real
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

          <div className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {WORKFLOW_STEPS.map((step, i) => (
                <div key={step.id} className="flex flex-1 items-center gap-3">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border text-xl transition-all ${
                      activeStep === i
                        ? "border-[#39ff14] bg-[#39ff14]/15 shadow-[0_0_20px_rgba(57,255,20,0.2)]"
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
                      <span role="img" aria-hidden="true">{step.icon}</span>
                    )}
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`hidden h-px flex-1 md:block ${
                        activeStep !== null && i < activeStep
                          ? "bg-[#39ff14]/60"
                          : "bg-[#39ff14]/10"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <div className="md:hidden">
                    <p className="text-xs font-semibold text-[#39ff14]/80">{step.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 hidden grid-cols-4 gap-2 md:grid">
              {WORKFLOW_STEPS.map((step) => (
                <p key={step.id} className="text-center text-[10px] text-[#39ff14]/50">
                  {step.label}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
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

        <aside className="rounded-xl border border-[#39ff14]/15 bg-[#0a120a]">
          <div className="flex items-center justify-between border-b border-[#39ff14]/10 px-4 py-3">
            <span className="text-[10px] tracking-widest text-[#39ff14]/50 uppercase">
              Live Run Log
            </span>
            <Radio
              className={`h-3 w-3 ${connected ? "text-[#39ff14]" : "text-red-400"}`}
              aria-hidden="true"
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
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
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#39ff14]/80">{run.step}</p>
                  </div>
                ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
