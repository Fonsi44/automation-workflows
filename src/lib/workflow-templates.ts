export type WorkflowStep = {
  id: string;
  label: string;
  icon: string;
  ms: number;
  configKey: string;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  samplePayload: string;
  steps: WorkflowStep[];
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "lead-enrichment",
    name: "Lead Enrichment",
    description: "Webhook → AI research → CRM update → Slack notify",
    samplePayload: '{"email":"lead@acme.com","company":"Acme Corp","source":"website"}',
    steps: [
      { id: "trigger", label: "Webhook Trigger", icon: "⚡", ms: 500, configKey: "webhookUrl" },
      { id: "ai", label: "AI Enrichment", icon: "🤖", ms: 1400, configKey: "aiPrompt" },
      { id: "transform", label: "Map to CRM", icon: "🔄", ms: 700, configKey: "crmMapping" },
      { id: "notify", label: "Slack Alert", icon: "📨", ms: 400, configKey: "slackChannel" },
    ],
  },
  {
    id: "invoice-processing",
    name: "Invoice Processing",
    description: "Email intake → extract fields → validate → accounting sync",
    samplePayload: '{"invoiceId":"INV-2041","vendor":"CloudBase","amount":1299}',
    steps: [
      { id: "trigger", label: "Email Intake", icon: "📧", ms: 600, configKey: "inbox" },
      { id: "ai", label: "Extract Fields", icon: "🤖", ms: 1600, configKey: "extractSchema" },
      { id: "transform", label: "Validate Rules", icon: "✓", ms: 900, configKey: "rules" },
      { id: "notify", label: "Sync QuickBooks", icon: "💰", ms: 800, configKey: "qbAccount" },
    ],
  },
  {
    id: "support-triage",
    name: "Support Triage",
    description: "Ticket created → classify → route → draft reply",
    samplePayload: '{"ticketId":"TK-8812","subject":"API rate limit","priority":"high"}',
    steps: [
      { id: "trigger", label: "New Ticket", icon: "🎫", ms: 400, configKey: "zendeskQueue" },
      { id: "ai", label: "Classify Intent", icon: "🤖", ms: 1100, configKey: "classifier" },
      { id: "transform", label: "Route Team", icon: "🔀", ms: 600, configKey: "routingRules" },
      { id: "notify", label: "Draft Reply", icon: "✍️", ms: 1200, configKey: "replyTemplate" },
    ],
  },
];

export const DEFAULT_CONFIG: Record<string, string> = {
  webhookUrl: "https://api.flowforge.dev/hooks/leads",
  aiPrompt: "Enrich company data from domain and LinkedIn signals",
  crmMapping: "hubspot.contact.v2",
  slackChannel: "#sales-alerts",
  inbox: "invoices@company.com",
  extractSchema: "vendor, amount, dueDate, lineItems",
  rules: "amount < 5000 → auto-approve",
  qbAccount: "Operating Expenses",
  zendeskQueue: "support-tier-2",
  classifier: "billing | technical | sales",
  routingRules: "billing → Finance, technical → Eng",
  replyTemplate: "gemini-support-v2",
};
