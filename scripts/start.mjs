#!/usr/bin/env node
/**
 * One command to run HireLens Review on your own computer:
 *
 *   npm run hirelens
 *
 * 1. Checks Node.js.
 * 2. Installs dependencies the first time.
 * 3. Makes sure the agent has a model: either ANTHROPIC_API_KEY in .env.local,
 *    or a ChatGPT sign-in through OpenAI's Codex CLI. If neither is present it
 *    starts the official sign-in, which opens your browser.
 * 4. Builds the app the first time, starts it, and opens it in your browser.
 *
 * Your ChatGPT sign-in is handled and stored by the Codex CLI on your computer.
 * HireLens Review never reads or stores it.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const isWin = process.platform === "win32";

function say(msg) {
  console.log(`\n\x1b[1m▸ ${msg}\x1b[0m`);
}
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: "inherit", shell: isWin, ...opts });
}

// 1. Node.js
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(`HireLens Review needs Node.js 20.9 or newer. You have ${process.versions.node}.`);
  console.error("Install the LTS version from https://nodejs.org and run this again.");
  process.exit(1);
}

// 2. Dependencies
if (!existsSync("node_modules")) {
  say("Installing dependencies (first run only, about two minutes)…");
  if (run("npm", ["install", "--no-audit", "--no-fund"]).status !== 0) process.exit(1);
}

// 3. A model for the agent
const envFile = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const hasAnthropicKey = /^\s*ANTHROPIC_API_KEY\s*=\s*\S+/m.test(envFile) || !!process.env.ANTHROPIC_API_KEY;
if (hasAnthropicKey) {
  say("Agent model: Claude, using the ANTHROPIC_API_KEY in .env.local.");
} else {
  const codex = isWin ? "npx.cmd" : "npx";
  const statusRun = spawnSync(codex, ["codex", "login", "status"], { encoding: "utf8", shell: isWin });
  const out = `${statusRun.stdout ?? ""}${statusRun.stderr ?? ""}`;
  if (/logged in/i.test(out)) {
    say("Agent model: your ChatGPT sign-in (through OpenAI Codex).");
  } else {
    say("Sign in with ChatGPT so the agent can run. Your browser will open.");
    console.log("  Any ChatGPT plan that includes Codex works (Plus, Pro, Business, Edu or Enterprise).");
    console.log("  The sign-in is handled by OpenAI's Codex CLI and stays on this computer.\n");
    if (run(codex, ["codex", "login"]).status !== 0) {
      console.log("\nSign-in did not complete. The review screens will still work; the live agent will not.");
    }
  }
}

// 4. Build, start, open
if (!existsSync(path.join(".next", "BUILD_ID"))) {
  say("Building the app (first run only)…");
  if (run("npm", ["run", "build"]).status !== 0) process.exit(1);
}

function freePort(start) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", () => resolve(freePort(start + 1)));
    s.once("listening", () => s.close(() => resolve(start)));
    s.listen(start, "127.0.0.1");
  });
}
const port = await freePort(Number(process.env.PORT) || 3000);
const url = `http://localhost:${port}`;

say(`Starting HireLens Review at ${url}`);
const server = spawn(isWin ? "npx.cmd" : "npx", ["next", "start", "-p", String(port)], {
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, AGENT_BACKEND: hasAnthropicKey ? "anthropic" : "chatgpt" },
});

setTimeout(() => {
  const opener = process.platform === "darwin" ? "open" : isWin ? "start" : "xdg-open";
  spawn(opener, [url], { stdio: "ignore", shell: isWin, detached: true }).on("error", () => {});
  console.log(`\n  Open ${url} if your browser did not open. Press Ctrl+C here to stop.\n`);
}, 2500);

process.on("SIGINT", () => {
  server.kill("SIGINT");
  process.exit(0);
});
