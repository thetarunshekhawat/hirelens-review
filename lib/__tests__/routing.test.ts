import { describe, it, expect } from "vitest";
import { routeRequest, getLatestUserText, buildProviderOptions } from "@/lib/ai/routing";
import { UIMessage } from "ai";

function makeMessages(text: string): UIMessage[] {
  return [{ id: "1", role: "user", parts: [{ type: "text", text }] }];
}

describe("getLatestUserText", () => {
  it("extracts text from the latest user message", () => {
    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "first" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "reply" }] },
      { id: "3", role: "user", parts: [{ type: "text", text: "second" }] },
    ];
    expect(getLatestUserText(messages)).toBe("second");
  });

  it("returns an empty string when there is no user message", () => {
    expect(getLatestUserText([])).toBe("");
  });
});

describe("routeRequest", () => {
  it("stays in chat mode for a lookup", () => {
    const result = routeRequest(makeMessages("Why was Fatima flagged?"));
    expect(result.mode).toBe("chat");
    expect(result.vendor).toBe("anthropic");
  });

  it("escalates when asked to weigh a recommendation", () => {
    const result = routeRequest(makeMessages("Should we adopt the tool? Weigh the trade-offs."));
    expect(result.mode).toBe("reasoning");
    expect(result.thinkingLevel).toBe("high");
  });

  it("escalates for an explicit step-by-step request", () => {
    expect(routeRequest(makeMessages("Walk me through it step by step")).mode).toBe("reasoning");
  });
});

describe("buildProviderOptions", () => {
  it("uses the high budget in reasoning mode", () => {
    const opts = buildProviderOptions("anthropic", "reasoning", "high", "claude-haiku-4-5");
    expect(opts.anthropic?.thinking.type).toBe("enabled");
    expect(opts.anthropic?.thinking.budgetTokens).toBe(15000);
  });

  it("uses the chat budget in chat mode", () => {
    const opts = buildProviderOptions("anthropic", "chat", "medium", "claude-haiku-4-5");
    expect(opts.anthropic?.thinking.budgetTokens).toBe(2000);
  });

  it("uses adaptive thinking on 5-family models", () => {
    const opts = buildProviderOptions("anthropic", "chat", "medium", "claude-sonnet-5");
    expect(opts.anthropic?.thinking.type).toBe("adaptive");
  });
});
