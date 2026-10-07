import { z } from "zod";

const envSchema = z.object({
  // Required for the agent. The review screens work without it.
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),

  // Optional: HMAC secret for signing conversation summaries
  // (falls back to a key derived from ANTHROPIC_API_KEY when unset).
  SUMMARY_HMAC_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export class MissingEnvError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing or invalid environment variables: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
  }
}

let cached: Env | null = null;

/**
 * Validate the environment once, on first use — at request time, not import
 * time, so `next build` succeeds without a key and every screen that reads
 * only the bundled case data still deploys. Anything that needs the key still
 * fails fast and says what is missing.
 */
export function assertEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join("."));
    console.error(`Missing or invalid environment variables: ${missing.join(", ")}. See env.template.`);
    throw new MissingEnvError(missing);
  }
  cached = result.data;
  return cached;
}

/** Non-throwing check, for the status endpoint. */
export function envStatus(): { ok: boolean; missing: string[] } {
  const result = envSchema.safeParse(process.env);
  return result.success
    ? { ok: true, missing: [] }
    : { ok: false, missing: result.error.issues.map((i) => i.path.join(".")) };
}
