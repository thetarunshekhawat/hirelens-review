/**
 * HireLens review tools as an MCP server.
 *
 * When the agent runs on a ChatGPT sign-in, the model is driven by OpenAI's
 * official Codex CLI, and Codex reaches our tools over the Model Context
 * Protocol. This server exposes exactly the same tools, with exactly the same
 * code, as the built-in agent uses (lib/ai/tools.ts) — so the rules, numbers
 * and outcomes cannot differ between the two ways of running the agent.
 *
 * Started by the app over stdio; not meant to be run by hand.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ZodObject, ZodRawShape } from "zod";
import { buildToolSet } from "@/lib/ai/tools";

type AnyTool = {
  description?: string;
  inputSchema: ZodObject<ZodRawShape>;
  execute: (input: unknown, options: unknown) => Promise<unknown>;
};

async function main() {
  const server = new McpServer({ name: "hirelens", version: "1.0.0" });
  const tools = buildToolSet() as unknown as Record<string, AnyTool>;

  for (const [name, t] of Object.entries(tools)) {
    server.registerTool(
      name,
      { description: t.description ?? name, inputSchema: t.inputSchema.shape },
      async (args: unknown) => {
        try {
          const result = await t.execute(args ?? {}, { toolCallId: name, messages: [] });
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
        }
      }
    );
  }

  await server.connect(new StdioServerTransport());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
