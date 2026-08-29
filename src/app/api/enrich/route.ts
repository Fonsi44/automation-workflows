import { generateObject } from "ai";
import { z } from "zod";
import { parseAiConfig, resolveGeminiModel } from "@/lib/ai-config";

export const maxDuration = 30;

const enrichSchema = z.object({
  company: z.string(),
  intentScore: z.number().min(0).max(1),
  segment: z.string(),
  summary: z.string(),
});

function mockEnrichment(payload: string) {
  try {
    const p = JSON.parse(payload) as Record<string, unknown>;
    const company = String(p.company ?? p.vendor ?? "Unknown Co");
    return {
      company,
      intentScore: 0.72,
      segment: "Mid-market SaaS",
      summary: `Mock enrichment for ${company} — configure GOOGLE_GENERATIVE_AI_API_KEY for live Gemini output.`,
    };
  } catch {
    return {
      company: "Unknown Co",
      intentScore: 0.5,
      segment: "Unclassified",
      summary: "Mock enrichment — payload could not be parsed.",
    };
  }
}

export async function POST(req: Request) {
  try {
    const { payload, config } = (await req.json()) as {
      payload?: string;
      config?: Record<string, string>;
    };

    if (!payload || typeof payload !== "string") {
      return Response.json({ error: "payload (string) is required" }, { status: 400 });
    }

    const ai = parseAiConfig(config);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({
        fallback: true,
        message: "GOOGLE_GENERATIVE_AI_API_KEY is not configured",
        ...mockEnrichment(payload),
        configUsed: ai,
      });
    }

    const { object } = await generateObject({
      model: resolveGeminiModel(ai.model ?? "gemini-3.6-flash"),
      temperature: ai.temperature,
      schema: enrichSchema,
      prompt: `${ai.promptOverride ? `${ai.promptOverride}\n\n` : ""}You enrich B2B lead and workflow payloads for a sales automation pipeline.
Given the JSON payload below, infer the company name, assign an intent score from 0 to 1,
classify the market segment, and write a one-sentence summary for a sales rep.

Payload:
${payload}`,
    });

    return Response.json({ ...object, model: ai.model, temperature: ai.temperature, configUsed: ai });
  } catch (error) {
    console.error("[enrich] API error:", error);
    const message = error instanceof Error ? error.message : "An error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
