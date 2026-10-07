import { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";

export function MessageWall({
  messages,
  status,
  durations,
  onDurationChange,
}: {
  messages: UIMessage[];
  status?: string;
  durations?: Record<string, number>;
  onDurationChange?: (key: string, duration: number) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="relative w-full">
      <div className="relative flex flex-col gap-4">
        {messages.map((message, i) => (
          <div key={message.id} className="w-full">
            {message.role === "user" ? (
              <UserMessage message={message} />
            ) : (
              <AssistantMessage
                message={message}
                status={status}
                isLastMessage={i === messages.length - 1}
                durations={durations}
                onDurationChange={onDurationChange}
              />
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
