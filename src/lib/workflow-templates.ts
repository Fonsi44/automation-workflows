export type WorkflowStep = {
  id: string;
  label: string;
  icon: string;
  ms: number;
  configKey: string;
  description: string;
  inputSchema: string;
  outputSchema: string;
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
      { id: "trigger", label: "Webhook Trigger", icon: "⚡", ms: 500, configKey: "webhookUrl", description: "Receives POST from CRM form or landing page", inputSchema: "{ email, company, source }", outputSchema: "LeadPayload" },
      { id: "ai", label: "AI Enrichment", icon: "🤖", ms: 1400, configKey: "aiPrompt", description: "Gemini enriches company size, industry, intent score", inputSchema: "LeadPayload", outputSchema: "EnrichedLead" },
      { id: "transform", label: "Map to CRM", icon: "🔄", ms: 700, configKey: "crmMapping", description: "Maps enriched fields to HubSpot contact schema", inputSchema: "EnrichedLead", outputSchema: "CRMRecord" },
      { id: "notify", label: "Slack Alert", icon: "📨", ms: 400, configKey: "slackChannel", description: "Posts summary to sales channel with deep link", inputSchema: "CRMRecord", outputSchema: "SlackAck" },
    ],
  },
  {
    id: "invoice-processing",
    name: "Invoice Processing",
    description: "Email intake → extract fields → validate → accounting sync",
    samplePayload: '{"invoiceId":"INV-2041","vendor":"CloudBase","amount":1299}',
    steps: [
      { id: "trigger", label: "Email Intake", icon: "📧", ms: 600, configKey: "inbox", description: "Parses incoming invoice attachments from inbox", inputSchema: "EmailMessage", outputSchema: "RawInvoice" },
      { id: "ai", label: "Extract Fields", icon: "🤖", ms: 1600, configKey: "extractSchema", description: "LLM extracts vendor, amount, due date, line items", inputSchema: "RawInvoice", outputSchema: "StructuredInvoice" },
      { id: "transform", label: "Validate Rules", icon: "✓", ms: 900, configKey: "rules", description: "Business rules: auto-approve under threshold", inputSchema: "StructuredInvoice", outputSchema: "ValidatedInvoice" },
      { id: "notify", label: "Sync QuickBooks", icon: "💰", ms: 800, configKey: "qbAccount", description: "Creates bill in QuickBooks operating account", inputSchema: "ValidatedInvoice", outputSchema: "QBSyncResult" },
    ],
  },
  {
    id: "support-triage",
    name: "Support Triage",
    description: "Ticket created → classify → route → draft reply",
    samplePayload: '{"ticketId":"TK-8812","subject":"API rate limit","priority":"high"}',
    steps: [
      { id: "trigger", label: "New Ticket", icon: "🎫", ms: 400, configKey: "zendeskQueue", description: "Webhook on new Zendesk ticket created", inputSchema: "{ ticketId, subject, priority }", outputSchema: "TicketPayload" },
      { id: "ai", label: "Classify Intent", icon: "🤖", ms: 1100, configKey: "classifier", description: "Routes billing vs technical vs sales intent", inputSchema: "TicketPayload", outputSchema: "ClassifiedTicket" },
      { id: "transform", label: "Route Team", icon: "🔀", ms: 600, configKey: "routingRules", description: "Assigns to Finance, Eng, or Sales queue", inputSchema: "ClassifiedTicket", outputSchema: "RoutedTicket" },
      { id: "notify", label: "Draft Reply", icon: "✍️", ms: 1200, configKey: "replyTemplate", description: "Generates draft reply for agent review", inputSchema: "RoutedTicket", outputSchema: "DraftReply" },
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
