// config.ts — central application settings.

function getDateAndTime(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return `Today is ${dateStr} (India Standard Time).`;
}

export const DATE_AND_TIME = getDateAndTime();

/* --------------------------------------------------------------- identity */
export const AI_NAME = "HireLens Review";
export const AI_DESCRIPTION =
  "HireLens Review is a governance review of a proposal to screen campus job applicants using their public social media. It examines each signal the tool reads, tests who it would unfairly reject, and gives the decision-makers a recommendation with its evidence and limits.";
export const BROWSER_TAB_TITLE = "HireLens Review";

/* ----------------------------------------------------------------- models */
export const DEFAULT_VENDOR = "anthropic" as const;
export const DEFAULT_MODEL_ID = "claude-haiku-4-5" as const;
export const DEFAULT_MODE = "chat" as const;
export const DEFAULT_THINKING_LEVEL = "medium" as const;

/** Small, fast model for moderation and conversation summaries. */
export const UTILITY_MODEL_ID = "claude-haiku-4-5";

/* ------------------------------------------------------------- moderation */
export const MODERATION_DENIAL_MESSAGE_SEXUAL = "I can't discuss explicit sexual content. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_SEXUAL_MINORS =
  "I can't discuss content involving minors in a sexual context. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_HARASSMENT = "I can't engage with harassing content. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_HARASSMENT_THREATENING =
  "I can't engage with threatening or harassing content. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_HATE = "I can't engage with hateful content. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_HATE_THREATENING = "I can't engage with threatening hate speech. Please be respectful.";
export const MODERATION_DENIAL_MESSAGE_ILLICIT = "I can't discuss illegal activities. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_ILLICIT_VIOLENT = "I can't discuss violent illegal activities. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_SELF_HARM =
  "I can't discuss self-harm. If you're struggling, please reach out to a mental health professional or a crisis helpline.";
export const MODERATION_DENIAL_MESSAGE_SELF_HARM_INTENT =
  "I can't discuss self-harm intentions. If you're struggling, please reach out to a mental health professional or a crisis helpline.";
export const MODERATION_DENIAL_MESSAGE_SELF_HARM_INSTRUCTIONS =
  "I can't provide instructions related to self-harm. If you're struggling, please reach out to a mental health professional or a crisis helpline.";
export const MODERATION_DENIAL_MESSAGE_VIOLENCE = "I can't discuss violent content. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_VIOLENCE_GRAPHIC = "I can't discuss graphic violent content. Please ask something else.";
export const MODERATION_DENIAL_MESSAGE_DEFAULT = "That message is outside what I can help with. Please ask something else.";

// Set MODERATION_PROVIDER=off to rely on the system prompt alone.
export type ModerationProvider = "llm" | "off";
export const MODERATION_PROVIDER: ModerationProvider =
  process.env.MODERATION_PROVIDER?.toLowerCase() === "off" ? "off" : "llm";
// "closed": block requests if moderation is unavailable. "open": allow them.
export const MODERATION_FAIL_POLICY = "closed" as const;

/* ------------------------------------------------------------ chat limits */
export const MAX_STEPS = 8; // tool-use steps per request
export const MAX_LIBRARY_SEARCHES = 3; // soft budget per answer, stated in the prompt
export const MAX_MESSAGES = 100;
export const MAX_MESSAGE_TEXT_LENGTH = 6000;
export const VERCEL_MAX_DURATION = 300;

/* ----------------------------------------------------- conversation memory */
export const COMPACTION_ENABLED = true;
export const COMPACTION_TOKEN_THRESHOLD = 40000;
export const COMPACTION_KEEP_RECENT = 4;
export const COMPACTION_CHARS_PER_TOKEN = 4;
export const COMPACTION_MAX_SUMMARY_WORDS = 1500;
export const COMPACTION_MAX_SUMMARY_CHARS = 8000;

/* --------------------------------------------------------------- thinking */
export const THINKING_BUDGET_LOW = 2000;
export const THINKING_BUDGET_MEDIUM = 8000;
export const THINKING_BUDGET_HIGH = 15000;
export const CHAT_THINKING_LEVEL = "low" as const;
export const MAX_OUTPUT_TOKENS: number | undefined = undefined;
export const STRONG_REASONING_LENGTH_THRESHOLD = 1200;

/* --------------------------------------------------- citation verification */
export const CITATION_CLAIM_MIN_CHARS = 20;
export const CITATION_CLAIM_MAX_CHARS = 300;
export const CITATION_CLAIM_MIN_WORD_LENGTH = 4;
export const CITATION_CLAIM_MIN_WORDS = 3;
export const CITATION_CLAIM_MATCH_RATIO = 0.6;
export const CITATION_QUOTE_MIN_WORD_LENGTH = 3;
export const CITATION_QUOTE_MATCH_RATIO = 0.8;

/* ---------------------------------------------------------- rate limiting */
export const RATE_LIMIT_ENABLED = true;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

/* ---------------------------------------------------------- reasoning view */
export type ReasoningDisplayMode = "full" | "truncated" | "hidden";
export const REASONING_DISPLAY_MODE: ReasoningDisplayMode = "hidden";
export const REASONING_TRUNCATE_WORDS = 15;
