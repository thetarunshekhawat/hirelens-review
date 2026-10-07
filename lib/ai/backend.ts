/**
 * Which model the agent runs on.
 *
 *   "anthropic" — a Claude model through the Anthropic API (ANTHROPIC_API_KEY).
 *                 Used on a hosted deployment.
 *   "chatgpt"   — the user's own ChatGPT sign-in, through OpenAI's official
 *                 Codex CLI. Local use only: the person running the app signs
 *                 in once with `npx codex login` and the agent uses their
 *                 account while they use it. This app never reads or stores
 *                 their login; the Codex CLI handles it.
 *
 * AGENT_BACKEND chooses explicitly. Otherwise: an Anthropic key wins; without
 * one, a local (non-Vercel) run uses ChatGPT; a hosted run without a key has
 * no agent, and says so.
 */
export type AgentBackend = "anthropic" | "chatgpt" | "none";

export function agentBackend(env: NodeJS.ProcessEnv = process.env): AgentBackend {
  const chosen = env.AGENT_BACKEND?.toLowerCase();
  if (chosen === "anthropic" || chosen === "chatgpt") return chosen;
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (!env.VERCEL) return "chatgpt";
  return "none";
}
