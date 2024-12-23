import { memo, useMemo } from "react";
import { useMessages } from "~/context/MessagesContex";
import { MemoizedMessageListItem } from "./MemoizedMessageListItem";

export const MessageList = memo(function MessageList({
  conversationId,
  userId,
  messagesEndRef,
}: {
  conversationId: string | null;
  userId?: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  const { getMessages } = useMessages();
  const messages = conversationId ? getMessages(conversationId) : [];

  console.log("Rendering MessageList with messages:", messages.length);
  // Memoize the message list items
  const messageItems = useMemo(
    () =>
      messages.map((message) => (
        <MemoizedMessageListItem
          key={message.id}
          message={message}
          userId={userId}
        />
      )),
    [messages, userId],
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messageItems}
      <div ref={messagesEndRef} />
    </div>
  );
});
