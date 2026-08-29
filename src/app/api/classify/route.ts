import { generateObject } from "ai";
import { z } from "zod";
import { parseAiConfig, resolveGeminiModel } from "@/lib/ai-config";

export const maxDuration = 30;

const schema = z.object({
  category: z.enum(["billing", "technical", "sales", "general"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  summary: z.string(),
});

export async function POST(req: Request) {
  try {
    const { payload, config } = (await req.json()) as {
      payload?: string;
      config?: Record<string, string>;
    };
    if (!payload) return Response.json({ error: "payload required" }, { status: 400 });

    const ai = parseAiConfig(config);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({
        category: "general",
        priority: "medium",
        summary: "Mock classification — set GOOGLE_GENERATIVE_AI_API_KEY",
        fallback: true,
        configUsed: ai,
      });
    }

    const { object } = await generateObject({
      model: resolveGeminiModel(ai.model ?? "gemini-3.6-flash"),
      temperature: ai.temperature,
      schema,
      prompt: `${ai.promptOverride ? `${ai.promptOverride}\n\n` : ""}Classify this support/workflow payload for triage:\n${payload}`,
    });

    return Response.json({ ...object, model: ai.model, temperature: ai.temperature, configUsed: ai });
  } catch (error) {
    console.error("[classify]", error);
    return Response.json({ error: "Classify failed" }, { status: 500 });
  }
}
