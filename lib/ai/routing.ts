import { UIMessage } from "ai";
import {
  DEFAULT_VENDOR,
  DEFAULT_MODEL_ID,
  DEFAULT_MODE,
  DEFAULT_THINKING_LEVEL,
  STRONG_REASONING_LENGTH_THRESHOLD,
  CHAT_THINKING_LEVEL,
} from "@/config";
import {
  thinkingBudget,
  anthropicThinkingOptions,
  Vendor,
  Mode,
  ThinkingLevel,
} from "@/lib/ai/model-registry";

export type RouteResult = {
  vendor: Vendor;
  modelId: string;
  mode: Mode;
  thinkingLevel: ThinkingLevel;
};

// Loosely typed: the thinking shape differs by model generation.
export type RouteProviderOptions = {
  anthropic?: Record<string, any>;
};

export function getLatestUserText(messages: UIMessage[]): string {
  const latestUserMessage = messages.filter((m) => m.role === "user").pop();
  if (!latestUserMessage) return "";

  return latestUserMessage.parts
    .filter((p) => p.type === "text")
    .map((p: any) => ("text" in p ? p.text : ""))
    .join("")
    .trim();
}

/**
 * Server-side routing only; end users cannot choose the model.
 *
 * Questions that ask the assistant to weigh several findings against each
 * other — a recommendation, a trade-off, a comparison across candidates or
 * groups — get a larger thinking budget. Lookups stay on the fast path.
 */
export function routeRequest(messages: UIMessage[]): RouteResult {
  const vendor: Vendor = DEFAULT_VENDOR;
  const modelId: string = DEFAULT_MODEL_ID;
  let mode: Mode = DEFAULT_MODE;
  let thinkingLevel: ThinkingLevel = DEFAULT_THINKING_LEVEL;

  const latestText = getLatestUserText(messages).toLowerCase();

  const strongReasoningCue =
    /\b(step[- ]by[- ]step|show\s+your\s+(work|reasoning)|trade[- ]?offs?|weigh|compare\s+all|should\s+we\s+(adopt|buy|use|deploy)|make\s+the\s+case|argue\s+(for|against)|counter[- ]?argument)\b/.test(
      latestText
    ) ||
    (latestText.length > STRONG_REASONING_LENGTH_THRESHOLD &&
      /\b(recommend|decision|justify|policy|board|committee)\b/.test(latestText));

  if (strongReasoningCue) {
    mode = "reasoning";
    thinkingLevel = "high";
  }

  return { vendor, modelId, mode, thinkingLevel };
}

export function buildProviderOptions(
  vendor: Vendor,
  mode: Mode,
  thinkingLevel: ThinkingLevel,
  modelId: string = DEFAULT_MODEL_ID
): RouteProviderOptions {
  const providerOptions: RouteProviderOptions = {};
  if (vendor === "anthropic") {
    const budgetTokens =
      mode === "reasoning" ? thinkingBudget(thinkingLevel) : thinkingBudget(CHAT_THINKING_LEVEL);
    const thinkingOpts = anthropicThinkingOptions(modelId, budgetTokens);
    if (Object.keys(thinkingOpts).length > 0) providerOptions.anthropic = thinkingOpts;
  }
  return providerOptions;
}
