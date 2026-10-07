"use client";

import { UIMessage, ToolCallPart, ToolResultPart } from "ai";
import { Response } from "@/components/ai-elements/response";
import { ReasoningPart } from "./reasoning-part";
import { ToolCall, ToolResult } from "./tool-call";
import { Sources } from "./sources";
import { rewriteCitationsInParts } from "@/lib/citations";
import type { UISource } from "@/types/data";
import { AssemblingIndicator } from "../ai-elements/assembling-indicator";
import { ProcessingIndicator } from "../ai-elements/processing-indicator";

export function AssistantMessage({
  message,
  status,
  isLastMessage,
  durations,
  onDurationChange,
}: {
  message: UIMessage;
  status?: string;
  isLastMessage?: boolean;
  durations?: Record<string, number>;
  onDurationChange?: (key: string, duration: number) => void;
}) {
  const isStreaming = status === "streaming" && isLastMessage;

  // Structured Sources box, rendered from the `data-sources` stream part
  // (independent of the model's markdown). Empty until the response finishes.
  const sourcesPart = message.parts.find((p) => p.type === "data-sources") as
    | { type: "data-sources"; data: UISource[] }
    | undefined;
  const sources = sourcesPart?.data ?? [];

  // Canonicalize citations across ALL text parts with shared numbering state —
  // the same transform the server runs on the joined text to build the Sources
  // box, so inline numbers and box numbers agree by construction.
  const textPartIndexes: number[] = [];
  message.parts.forEach((p, i) => {
    if (p.type === "text") textPartIndexes.push(i);
  });
  const rewrittenTexts = rewriteCitationsInParts(
    textPartIndexes.map((i) => (message.parts[i] as { text: string }).text)
  );
  const rewrittenByIndex = new Map<number, string>(
    textPartIndexes.map((partIndex, j) => [partIndex, rewrittenTexts[j]])
  );

  // Track which parts come after tool calls
  const hasToolBefore = new Set<number>();
  let seenTool = false;
  for (let i = 0; i < message.parts.length; i++) {
    const p = message.parts[i];
    if (p.type?.startsWith("tool-") || p.type === "dynamic-tool") {
      seenTool = true;
    } else if (seenTool && (p.type === "reasoning" || p.type === "text")) {
      hasToolBefore.add(i);
    }
  }

  // Check if there's any tool or reasoning in the message
  const hasContentBefore = message.parts.some(
    (p) => p.type === "reasoning" || p.type?.startsWith("tool-") || p.type === "dynamic-tool"
  );

  // Find the last text part index
  let lastTextIndex = -1;
  for (let i = message.parts.length - 1; i >= 0; i--) {
    if (message.parts[i].type === "text") {
      lastTextIndex = i;
      break;
    }
  }

  return (
    <div className="w-full">
      <div className="hl-bubble-ai text-sm flex flex-col gap-4">
        {message.parts.map((part, i) => {
          const isPartStreaming =
            isStreaming && i === message.parts.length - 1;
          const durationKey = `${message.id}-${i}`;
          const duration = durations?.[durationKey];

          if (part.type === "text") {
            const isLastText = i === lastTextIndex;
            const isAfterTool = hasToolBefore.has(i);
            // Check if there's already an intermediate text part after tools (processing already shown)
            const hasIntermediateProcessingText = isLastText && seenTool && message.parts.some(
              (p, idx) => idx < i && p.type === "text" && hasToolBefore.has(idx)
            );
            return (
              <div key={`${message.id}-${i}`}>
                {isLastText && isAfterTool && !hasIntermediateProcessingText && (
                  <ProcessingIndicator isStreaming={false} />
                )}
                {isLastText && hasContentBefore && (
                  <AssemblingIndicator isStreaming={isPartStreaming} />
                )}
                {!isLastText && isAfterTool && (
                  <ProcessingIndicator isStreaming={isPartStreaming} />
                )}
                <Response isAnimating={isPartStreaming}>
                  {rewrittenByIndex.get(i) ?? part.text}
                </Response>
              </div>
            );
          } else if (part.type === "reasoning") {
            return (
              <ReasoningPart
                key={`${message.id}-${i}`}
                part={part}
                isStreaming={isPartStreaming}
                category={hasToolBefore.has(i) ? "processing" : "thinking"}
                duration={duration}
                onDurationChange={
                  onDurationChange
                    ? (d) => onDurationChange(durationKey, d)
                    : undefined
                }
              />
            );
          } else if (
            part.type.startsWith("tool-") ||
            part.type === "dynamic-tool"
          ) {
            if ("state" in part && part.state === "output-available") {
              return (
                <ToolResult
                  key={`${message.id}-${i}`}
                  part={part as unknown as ToolResultPart}
                />
              );
            } else {
              return (
                <ToolCall
                  key={`${message.id}-${i}`}
                  part={part as unknown as ToolCallPart}
                />
              );
            }
          }
          return null;
        })}
      </div>
      {sources.length > 0 && <Sources sources={sources} />}
    </div>
  );
}
