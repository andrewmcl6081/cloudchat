import React from "react";

const ChatHeaderSkeleton = () => (
  <div className="border-b border-gray-200 px-6 py-4 animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-48 bg-gray-200 rounded" />
      </div>
    </div>
  </div>
);

const MessageBubbleSkeleton = ({ isRight = false }: { isRight?: boolean }) => (
  <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
    <div
      className={`rounded-lg px-4 py-2 max-w-[70%] space-y-2 ${isRight ? "bg-blue-100" : "bg-gray-100"}`}
    >
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
  </div>
);

const MessageListSkeleton = () => (
  <div className="flex-1 overflow-y-auto p-6 space-y-4">
    <MessageBubbleSkeleton />
    <MessageBubbleSkeleton isRight />
    <MessageBubbleSkeleton />
    <MessageBubbleSkeleton isRight />
    <MessageBubbleSkeleton />
    <MessageBubbleSkeleton isRight />
    <MessageBubbleSkeleton />
  </div>
);

const ChatSkeleton = () => (
  <div className="flex flex-col h-full">
    <ChatHeaderSkeleton />
    <MessageListSkeleton />
  </div>
);

export default ChatSkeleton;
