export const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "portfolio-live-party.fonsi44.partykit.dev";

export function randomName() {
  return `Ops-${Math.floor(Math.random() * 900 + 100)}`;
}

export const WORKFLOW_STEPS = [
  { id: "trigger", label: "Webhook Trigger", icon: "⚡", ms: 600 },
  { id: "ai", label: "AI Agent Step", icon: "🤖", ms: 1200 },
  { id: "transform", label: "Transform Data", icon: "🔄", ms: 800 },
  { id: "notify", label: "Send Notification", icon: "📨", ms: 500 },
] as const;
