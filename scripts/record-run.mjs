#!/usr/bin/env node
/**
 * Record one real autonomous review run, so the hosted site can show it.
 *
 * Starts nothing itself: run the app first (`npm run hirelens`), then
 *   node scripts/record-run.mjs                 # records from http://localhost:3000
 *   node scripts/record-run.mjs --url http://localhost:3210
 *
 * The run is saved to data/recorded-run.json exactly as the agent produced it:
 * its notes, every tool call with its input and output, the memo and the
 * sources. Nothing is edited.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const urlArg = args.indexOf("--url");
const base = urlArg >= 0 ? args[urlArg + 1] : "http://localhost:3000";

const status = await (await fetch(`${base}/api/agent-status`)).json();
console.log(`Agent backend: ${status.label}`);
const started = Date.now();

const res = await fetch(`${base}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ mode: "review" }),
});
if (!res.ok || !res.body) {
  console.error(`The run did not start: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const parts = [];
const tools = new Map();
const texts = new Map();
let buffer = "";
const decoder = new TextDecoder();

function handle(chunk) {
  switch (chunk.type) {
    case "text-start":
      texts.set(chunk.id, { type: "text", text: "", state: "done" });
      parts.push(texts.get(chunk.id));
      break;
    case "text-delta":
      texts.get(chunk.id).text += chunk.delta;
      break;
    case "tool-input-available": {
      const part = {
        type: `tool-${chunk.toolName}`,
        toolCallId: chunk.toolCallId,
        state: "input-available",
        input: chunk.input,
      };
      tools.set(chunk.toolCallId, part);
      parts.push(part);
      process.stdout.write(".");
      break;
    }
    case "tool-output-available": {
      const part = tools.get(chunk.toolCallId);
      if (part) Object.assign(part, { state: "output-available", output: chunk.output });
      break;
    }
    case "data-sources":
      parts.push({ type: "data-sources", id: "sources", data: chunk.data });
      break;
    case "error":
      console.error(`\nAgent error: ${chunk.errorText}`);
      process.exit(1);
  }
}

for await (const bytes of res.body) {
  buffer += decoder.decode(bytes, { stream: true });
  let i;
  while ((i = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6);
    if (payload === "[DONE]") continue;
    try {
      handle(JSON.parse(payload));
    } catch {
      /* partial line */
    }
  }
}

const seconds = Math.round((Date.now() - started) / 1000);
const record = {
  recordedAt: new Date().toISOString(),
  backend: status.label,
  durationSeconds: seconds,
  toolCalls: tools.size,
  messages: [
    { id: "mission", role: "user", parts: [{ type: "text", text: "Run the full review." }] },
    { id: "recorded-run", role: "assistant", parts },
  ],
};
mkdirSync("data", { recursive: true });
writeFileSync("data/recorded-run.json", JSON.stringify(record, null, 2));
console.log(`\nSaved data/recorded-run.json: ${tools.size} tool calls in ${seconds}s.`);
