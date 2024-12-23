// MemoizedMessageListItem.tsx
import { memo } from "react";
import type { MessageListItemProps } from "~/types";

export const MemoizedMessageListItem = memo(
  function MessageListItem({ message, userId }: MessageListItemProps) {
    const isCurrentUser = message.sender.auth0Id === userId;
    console.log("Rendering MemoizedMessageListItem for message");
    return (
      <div
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`rounded-lg px-4 py-2 max-w-[70%] ${isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"}`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <span
            className={`text-xs ${isCurrentUser ? "text-blue-100" : "text-gray-500"}`}
          >
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if message content or userId changes
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.userId === nextProps.userId
    );
  },
);
