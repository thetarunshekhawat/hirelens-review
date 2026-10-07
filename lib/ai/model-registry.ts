// lib/ai/model-registry.ts
import { anthropic } from "@ai-sdk/anthropic";
import {
  THINKING_BUDGET_LOW,
  THINKING_BUDGET_MEDIUM,
  THINKING_BUDGET_HIGH,
  UTILITY_MODEL_ID,
} from "@/config";

export type Vendor = "anthropic";
export type Mode = "chat" | "reasoning";
export type ThinkingLevel = "off" | "low" | "medium" | "high";

/**
 * Anthropic thinking configuration differs by model generation:
 * - Haiku 4.5 and older take a fixed `budgetTokens`.
 * - 4.6- and 5-family models use adaptive thinking and reject `budgetTokens`.
 * - Fable models always think; the parameter must be omitted.
 */
export function anthropicThinkingOptions(
  modelId: string,
  budgetTokens: number
): Record<string, any> {
  if (modelId.includes("fable")) return {};
  if (/(opus-5|opus-4-[678]|sonnet-5|sonnet-4-6)/.test(modelId)) {
    return { thinking: { type: "adaptive" } };
  }
  return { thinking: { type: "enabled", budgetTokens } };
}

export function getModel(_vendor: Vendor, modelId: string) {
  return anthropic(modelId);
}

/** Small, fast model for background work: moderation and conversation summaries. */
export function getUtilityModel() {
  return anthropic(UTILITY_MODEL_ID);
}

/** Background calls run without extended thinking so they stay fast. */
export function utilityProviderOptions(): Record<string, Record<string, any>> {
  if (UTILITY_MODEL_ID.includes("fable")) return {};
  return { anthropic: { thinking: { type: "disabled" } } };
}

export function thinkingBudget(level: ThinkingLevel) {
  switch (level) {
    case "low":
      return THINKING_BUDGET_LOW;
    case "medium":
      return THINKING_BUDGET_MEDIUM;
    case "high":
      return THINKING_BUDGET_HIGH;
    default:
      return 0;
  }
}
