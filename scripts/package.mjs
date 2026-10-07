#!/usr/bin/env node
/**
 * Build the submission zip:  npm run package
 *
 * Produces dist/HireLens-Review.zip containing the source, START-HERE.md, the
 * recorded run and, if present, the white paper in docs/. Leaves out anything
 * that is rebuilt on the recipient's machine (node_modules, .next) and
 * anything private (.env files, local tooling).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";

const out = "dist/HireLens-Review.zip";
mkdirSync("dist", { recursive: true });
if (existsSync(out)) rmSync(out);

const exclude = [
  "node_modules/*",
  ".next/*",
  ".git/*",
  ".vercel/*",
  ".gstack/*",
  "scratch/*",
  "dist/*",
  "*.env",
  ".env*",
  "*.tsbuildinfo",
  "next-env.d.ts",
  "*.DS_Store",
  "CLAUDE.md",
  "AGENTS.md",
];
const args = ["-r", "-q", out, ".", "-x", ...exclude];
const r = spawnSync("zip", args, { stdio: "inherit" });
if (r.status !== 0) {
  console.error("zip failed. On Windows, use: git archive --format=zip -o dist/HireLens-Review.zip HEAD");
  process.exit(1);
}
const kb = Math.round(statSync(out).size / 1024);
console.log(`Created ${out} (${kb} KB).`);
if (!existsSync("docs/HireLens-Review-White-Paper.pdf")) {
  console.log("Note: docs/HireLens-Review-White-Paper.pdf is not there yet, so the zip has no white paper.");
}
