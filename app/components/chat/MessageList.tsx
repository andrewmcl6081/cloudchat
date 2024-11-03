import { MessageListProps } from "~/types";

export function MessageList({ messages, currentUserId, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.senderId === currentUserId ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`rounded-lg px-4 py-2 max-w-[70%] ${
              message.senderId === currentUserId
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            <span className={`text-xs ${
              message.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}