import { describe, it, expect } from "vitest";
import { agentBackend } from "@/lib/ai/backend";

const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("agent backend selection", () => {
  it("uses Claude when an Anthropic key is set", () => {
    expect(agentBackend(env({ ANTHROPIC_API_KEY: "x" }))).toBe("anthropic");
  });

  it("uses the ChatGPT sign-in locally when there is no key", () => {
    expect(agentBackend(env({}))).toBe("chatgpt");
  });

  it("has no agent on a hosted deployment without a key", () => {
    expect(agentBackend(env({ VERCEL: "1" }))).toBe("none");
  });

  it("honours an explicit choice", () => {
    expect(agentBackend(env({ AGENT_BACKEND: "chatgpt", ANTHROPIC_API_KEY: "x" }))).toBe("chatgpt");
    expect(agentBackend(env({ AGENT_BACKEND: "anthropic" }))).toBe("anthropic");
  });

  it("never enables the ChatGPT sign-in on a hosted deployment by default", () => {
    expect(agentBackend(env({ VERCEL: "1", ANTHROPIC_API_KEY: "" }))).toBe("none");
  });
});
