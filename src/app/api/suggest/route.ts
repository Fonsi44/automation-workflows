import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const schema = z.object({
  templateId: z.enum(["lead-enrichment", "invoice-processing", "support-triage"]),
  name: z.string(),
  reasoning: z.string(),
});

export async function POST(req: Request) {
  try {
    const { description } = (await req.json()) as { description?: string };
    if (!description?.trim()) return Response.json({ error: "description required" }, { status: 400 });

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({
        templateId: "lead-enrichment",
        name: "Lead Enrichment",
        reasoning: "Mock suggestion — configure API key.",
        fallback: true,
      });
    }

    const { object } = await generateObject({
      model: google("gemini-3.6-flash"),
      schema,
      prompt: `Suggest the best FlowForge workflow template for: ${description}`,
    });

    return Response.json(object);
  } catch (error) {
    console.error("[suggest]", error);
    return Response.json({ error: "Suggest failed" }, { status: 500 });
  }
}
