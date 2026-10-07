import { agentBackend } from "@/lib/ai/backend";

export const dynamic = "force-dynamic";

/** Which model the agent is running on here, so the interface can say so. */
export async function GET() {
  const backend = agentBackend();
  const label =
    backend === "chatgpt"
      ? "Your ChatGPT sign-in, through OpenAI Codex"
      : backend === "anthropic"
        ? "Claude, through the Anthropic API"
        : "Not connected on this deployment";
  return Response.json({ backend, label });
}
