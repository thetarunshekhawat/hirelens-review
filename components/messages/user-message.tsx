import { UIMessage } from "ai";
import { Response } from "@/components/ai-elements/response";

export function UserMessage({ message }: { message: UIMessage }) {
  return (
    <div className="flex w-full justify-end whitespace-pre-wrap">
      <div className="hl-bubble-user w-fit max-w-[85%] break-words px-4 py-3 sm:max-w-lg">
        <div className="text-sm">
          {message.parts.map((part, i) =>
            part.type === "text" ? <Response key={`${message.id}-${i}`}>{part.text}</Response> : null
          )}
        </div>
      </div>
    </div>
  );
}
