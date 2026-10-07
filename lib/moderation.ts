/**
 * Input moderation.
 *
 * Every user message is classified by the utility model before it reaches the
 * assistant. MODERATION_PROVIDER=off disables the call and leaves only the
 * system-prompt guardrails.
 *
 * This product discusses religion, caste, gender, disability, political
 * opinion and discrimination as a matter of course — those are the risks it
 * reviews. The classifier is told explicitly that analysing them is safe, so a
 * privacy manager asking "does this signal penalise Muslim candidates?" is not
 * refused as hate speech.
 */

import { generateText } from "ai";
import { getUtilityModel, utilityProviderOptions } from "@/lib/ai/model-registry";
import {
  MODERATION_PROVIDER,
  MODERATION_DENIAL_MESSAGE_SEXUAL,
  MODERATION_DENIAL_MESSAGE_SEXUAL_MINORS,
  MODERATION_DENIAL_MESSAGE_HARASSMENT,
  MODERATION_DENIAL_MESSAGE_HARASSMENT_THREATENING,
  MODERATION_DENIAL_MESSAGE_HATE,
  MODERATION_DENIAL_MESSAGE_HATE_THREATENING,
  MODERATION_DENIAL_MESSAGE_ILLICIT,
  MODERATION_DENIAL_MESSAGE_ILLICIT_VIOLENT,
  MODERATION_DENIAL_MESSAGE_SELF_HARM,
  MODERATION_DENIAL_MESSAGE_SELF_HARM_INTENT,
  MODERATION_DENIAL_MESSAGE_SELF_HARM_INSTRUCTIONS,
  MODERATION_DENIAL_MESSAGE_VIOLENCE,
  MODERATION_DENIAL_MESSAGE_VIOLENCE_GRAPHIC,
  MODERATION_DENIAL_MESSAGE_DEFAULT,
} from "@/config";

export interface ModerationResult {
  flagged: boolean;
  skipped?: boolean;
  denialMessage?: string;
  category?: string;
}

const CATEGORY_DENIAL_MESSAGES: Record<string, string> = {
  sexual: MODERATION_DENIAL_MESSAGE_SEXUAL,
  "sexual/minors": MODERATION_DENIAL_MESSAGE_SEXUAL_MINORS,
  harassment: MODERATION_DENIAL_MESSAGE_HARASSMENT,
  "harassment/threatening": MODERATION_DENIAL_MESSAGE_HARASSMENT_THREATENING,
  hate: MODERATION_DENIAL_MESSAGE_HATE,
  "hate/threatening": MODERATION_DENIAL_MESSAGE_HATE_THREATENING,
  illicit: MODERATION_DENIAL_MESSAGE_ILLICIT,
  "illicit/violent": MODERATION_DENIAL_MESSAGE_ILLICIT_VIOLENT,
  "self-harm": MODERATION_DENIAL_MESSAGE_SELF_HARM,
  "self-harm/intent": MODERATION_DENIAL_MESSAGE_SELF_HARM_INTENT,
  "self-harm/instructions": MODERATION_DENIAL_MESSAGE_SELF_HARM_INSTRUCTIONS,
  violence: MODERATION_DENIAL_MESSAGE_VIOLENCE,
  "violence/graphic": MODERATION_DENIAL_MESSAGE_VIOLENCE_GRAPHIC,
};

// Most severe first; the first match decides the denial message.
const CATEGORY_CHECK_ORDER: string[] = [
  "sexual/minors",
  "sexual",
  "harassment/threatening",
  "harassment",
  "hate/threatening",
  "hate",
  "illicit/violent",
  "illicit",
  "self-harm/instructions",
  "self-harm/intent",
  "self-harm",
  "violence/graphic",
  "violence",
];

const SYSTEM =
  "You are a content-safety classifier for a hiring-governance review tool. Classify the user message into exactly one category.\n" +
  "Categories (use exactly these strings):\n" +
  CATEGORY_CHECK_ORDER.map((c) => `- ${c}`).join("\n") +
  "\n- safe\n\n" +
  "Rules:\n" +
  '- "safe" means the message contains NONE of the harmful categories.\n' +
  "- Questions that analyse discrimination, bias, protected characteristics (religion, caste, gender, disability, " +
  "marital status, political opinion, region, language), privacy law or hiring fairness are SAFE, even when they " +
  "name a group or quote an offensive example in order to assess it.\n" +
  "- Only flag content that itself requests, promotes or graphically depicts harm.\n" +
  '- Respond with ONLY a JSON object: {"category": "<category>"} and no other text.';

function resultForCategory(category: string): ModerationResult {
  return {
    flagged: true,
    category,
    denialMessage: CATEGORY_DENIAL_MESSAGES[category] || MODERATION_DENIAL_MESSAGE_DEFAULT,
  };
}

async function classify(text: string): Promise<ModerationResult> {
  const result = await generateText({
    model: getUtilityModel(),
    system: SYSTEM,
    prompt: text,
    providerOptions: utilityProviderOptions(),
  });

  const raw = result.text.trim();
  const match = raw.match(/\{[^{}]*"category"[^{}]*\}/);
  if (!match) {
    // Caught by the caller; MODERATION_FAIL_POLICY then decides.
    throw new Error(`Unparseable moderation response: ${raw.slice(0, 200)}`);
  }

  const category = String(JSON.parse(match[0]).category ?? "").trim().toLowerCase();
  if (!category || category === "safe") return { flagged: false };
  if (CATEGORY_DENIAL_MESSAGES[category]) return resultForCategory(category);
  return { flagged: true, denialMessage: MODERATION_DENIAL_MESSAGE_DEFAULT };
}

export async function isContentFlagged(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) return { flagged: false };
  if (MODERATION_PROVIDER === "off") return { flagged: false };

  try {
    return await classify(text);
  } catch (error) {
    console.error("Moderation error:", error);
    // skipped=true lets MODERATION_FAIL_POLICY decide whether to block.
    return { flagged: false, skipped: true };
  }
}
