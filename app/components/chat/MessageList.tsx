import { MessageListProps } from "~/types";

export function MessageList({
  messages,
  currentUserId,
  messagesEndRef,
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender.auth0Id === currentUserId
              ? "justify-start"
              : "justify-end"
          }`}
        >
          <div
            className={`rounded-lg px-4 py-2 max-w-[70%] ${
              message.sender.auth0Id === currentUserId
                ? "bg-gray-100 text-gray-900"
                : "bg-blue-500 text-white"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            <span
              className={`text-xs ${
                message.sender.auth0Id === currentUserId
                  ? "text-gray-500"
                  : "text-blue-100"
              }`}
            >
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
