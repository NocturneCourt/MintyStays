import Anthropic from "@anthropic-ai/sdk";
import {
  ClaudeJsonParseError,
  parseClaudeCoolingJson,
  type CoolingExtraction,
} from "./parseClaudeJson";

export type AnthropicCoolingClient = {
  messages: {
    create(input: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{
        role: "user";
        content: string;
      }>;
    }): Promise<AnthropicMessageLike>;
  };
};

type AnthropicMessageLike = {
  content: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: string;
        text?: string;
      }
  >;
};

export type CoolingExtractor = {
  readonly model?: string;
  extract(reviewText: string): Promise<CoolingExtraction>;
};

export type CoolingExtractorOptions = {
  client?: AnthropicCoolingClient;
  model?: string;
};

const DEFAULT_MODEL = "claude-sonnet-4-6";

const COOLING_VOCABULARY =
  /\b(a\/?c|air[- ]?con(?:ditioning)?|cooling|cold|hot|stuffy|stifling|fan|sweat|temperature)\b/i;

const SYSTEM_PROMPT = [
  "You classify hotel and short-term rental review text only for air-conditioning cooling performance.",
  "Return only JSON with these exact keys: mentions_cooling, sentiment, ac_type_hint, confidence.",
  "Use sentiment positive, negative, or neutral.",
  "Use ac_type_hint split, central, portable, none, or null.",
  "Use confidence as a number from 0 to 1.",
  "Do not include Markdown, comments, or code fences.",
].join(" ");

export function createCoolingExtractor(
  options: CoolingExtractorOptions = {},
): CoolingExtractor {
  const client =
    options.client ??
    new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  const model = options.model ?? process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;

  return {
    model,
    async extract(reviewText) {
      const rawOutput = await requestCoolingExtraction(
        client,
        model,
        buildCoolingExtractionPrompt(reviewText),
      );

      try {
        return parseClaudeCoolingJson(rawOutput);
      } catch (error) {
        if (!(error instanceof ClaudeJsonParseError)) {
          throw error;
        }

        const repairedOutput = await requestCoolingExtraction(
          client,
          model,
          [
            "Repair the following classifier output.",
            "Return ONLY one JSON object with the required exact keys.",
            "Do not add Markdown or explanation.",
            "",
            rawOutput,
          ].join("\n"),
        );

        return parseClaudeCoolingJson(repairedOutput);
      }
    },
  };
}

export function mentionsCoolingVocabulary(reviewText: string) {
  return COOLING_VOCABULARY.test(reviewText);
}

export function buildCoolingExtractionPrompt(reviewText: string) {
  return [
    "Classify this review text for cooling signal.",
    "",
    "Rules:",
    "- mentions_cooling is true only if the text discusses AC, air conditioning, room cooling, room coldness, fans, or failure to cool.",
    "- sentiment is positive when cooling is effective, negative when weak/broken/throttled/too warm, neutral when mixed or unclear.",
    "- ac_type_hint is only set when the text names the AC type.",
    "",
    "Review text:",
    reviewText,
  ].join("\n");
}

function readTextMessage(message: AnthropicMessageLike) {
  const text = message.content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude cooling output did not include a text block");
  }

  return text;
}

async function requestCoolingExtraction(
  client: AnthropicCoolingClient,
  model: string,
  prompt: string,
) {
  const message = await client.messages.create({
    model,
    max_tokens: 220,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return readTextMessage(message);
}
