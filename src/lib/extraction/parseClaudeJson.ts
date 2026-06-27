import { z } from "zod";

export const coolingExtractionSchema = z
  .object({
    mentions_cooling: z.boolean(),
    sentiment: z.enum(["positive", "negative", "neutral"]),
    ac_type_hint: z.enum(["split", "central", "portable", "none"]).nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type CoolingExtraction = z.infer<typeof coolingExtractionSchema>;

export class ClaudeJsonParseError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
  ) {
    super(message);
    this.name = "ClaudeJsonParseError";
  }
}

export function parseClaudeCoolingJson(rawOutput: string): CoolingExtraction {
  const jsonText = stripClaudeCodeFence(rawOutput);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new ClaudeJsonParseError(
      `Claude cooling output was not valid JSON: ${formatParseError(error)}`,
      rawOutput,
    );
  }

  const result = coolingExtractionSchema.safeParse(parsed);

  if (!result.success) {
    throw new ClaudeJsonParseError(
      `Claude cooling output failed schema validation: ${result.error.message}`,
      rawOutput,
    );
  }

  return result.data;
}

export function stripClaudeCodeFence(rawOutput: string) {
  let text = rawOutput.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fence?.[1]) {
    text = fence[1].trim();
  }

  if (!text.startsWith("{") || !text.endsWith("}")) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
  }

  return text;
}

function formatParseError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown parse error";
}
