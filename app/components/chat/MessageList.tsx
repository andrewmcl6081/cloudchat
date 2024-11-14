import { MessageListProps } from "~/types";
import { MessageListItem } from "./MessageListItem";

export function MessageList({
  messages,
  userId,
  messagesEndRef,
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <MessageListItem key={message.id} message={message} userId={userId} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
