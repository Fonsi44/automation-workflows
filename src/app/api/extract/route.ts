import { generateObject } from "ai";
import { z } from "zod";
import { parseAiConfig, resolveGeminiModel } from "@/lib/ai-config";

export const maxDuration = 30;

const schema = z.object({
  vendor: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  lineItems: z.array(z.string()),
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
        vendor: "Unknown Vendor",
        amount: 0,
        dueDate: "N/A",
        lineItems: ["Mock extract"],
        summary: "Mock invoice extraction",
        fallback: true,
        configUsed: ai,
      });
    }

    const { object } = await generateObject({
      model: resolveGeminiModel(ai.model ?? "gemini-3.6-flash"),
      temperature: ai.temperature,
      schema,
      prompt: `${ai.promptOverride ? `${ai.promptOverride}\n\n` : ""}Extract invoice fields from this JSON/text payload:\n${payload}`,
    });

    return Response.json({ ...object, model: ai.model, temperature: ai.temperature, configUsed: ai });
  } catch (error) {
    console.error("[extract]", error);
    return Response.json({ error: "Extract failed" }, { status: 500 });
  }
}
