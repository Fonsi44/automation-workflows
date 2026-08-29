import { google } from "@ai-sdk/google";

export type AiConfig = {
  model?: string;
  temperature?: number;
  promptOverride?: string;
};

export function parseAiConfig(config?: Record<string, string>): AiConfig {
  const temperature = Number(config?.temperature ?? config?.aiTemperature ?? "0.7");
  return {
    model: config?.model ?? config?.aiModel ?? "gemini-3.6-flash",
    temperature: Number.isFinite(temperature) ? Math.min(1, Math.max(0, temperature)) : 0.7,
    promptOverride: config?.aiPrompt ?? config?.classifier ?? config?.extractSchema,
  };
}

export function resolveGeminiModel(modelId: string) {
  return google(modelId);
}
