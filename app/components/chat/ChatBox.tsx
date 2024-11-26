// app/components/ChatBox.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSocketContext } from "~/hooks/useSocketContext";
import { useSocketEvent } from "~/hooks/useSocketEvent";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { useMessages } from "~/context/MessagesContex";
import { ChatHeader } from "./ChatHeader";
import { useLoading } from "~/context/LoadingContext";
import { useFetcher } from "@remix-run/react";
import { useLogout } from "~/context/LogoutContext";
import { useAuth0 } from "@auth0/auth0-react";
import ChatBoxSkeleton from "./ChatBoxSkeleton";
import type {
  SendMessageResponse,
  ConversationResponse,
  MessagesResponse,
  ChatBoxProps,
} from "~/types";

export default function ChatBox({ selectedUserId }: ChatBoxProps) {
  // Fetchers
  const conversationFetcher = useFetcher<ConversationResponse>();
  const messagesFetcher = useFetcher<MessagesResponse>();
  const sendMessageFetcher = useFetcher<SendMessageResponse>();
  const { user } = useAuth0();

  // State management
  const [messageInput, setMessageInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Context
  const { isConnected, joinConversation, leaveConversation, sendMessage } =
    useSocketContext();
  const { addMessage, setConversationMessages, clearConversation } =
    useMessages();
  const { componentsAreLoading } = useLoading();
  const { addLogoutHandler, removeLogoutHandler } = useLogout();

  // Refs
  const prevSelectedUserId = useRef<string | null>(null);

  // Socket event handlers
  useSocketEvent({
    onNewMessage: (message) => {
      console.log("New Message Received:", message);
      addMessage(message.conversationId, message);
      scrollToBottom(true);
    },
    onUserJoined: (data) => {
      console.log("User joined chat:", data);
      // Add UI feedback when user joins
    },
    onUserLeft: (data) => {
      console.log("User left chat:", data);
      // Add UI feedback when user leaves
    },
  });

  const cleanup = useCallback(
    (currentConversationId: string | null) => {
      if (currentConversationId) {
        console.log("Cleaning up conversation:", currentConversationId);
        leaveConversation(currentConversationId);
        clearConversation(currentConversationId);
        setConversationId(null);
        setMessageInput("");
      }
    },
    [leaveConversation, clearConversation],
  );

  useEffect(() => {
    if (prevSelectedUserId.current !== selectedUserId) {
      // Reset loading state for new user
      setInitialLoading(true);

      // Simulate a delay to ensure spinner shows
      const timer = setTimeout(() => {
        setInitialLoading(false);
      }, 1250);

      // Update the previous User ID
      prevSelectedUserId.current = selectedUserId;

      return () => clearTimeout(timer);
    }
  }, [selectedUserId]);

  useEffect(() => {
    // Create handler that uses cleanup
    const handleLogout = () => cleanup(conversationId);

    // Register the logout handler
    addLogoutHandler(handleLogout);

    // Cleanup on unmount
    return () => removeLogoutHandler(handleLogout);
  }, [conversationId, addLogoutHandler, removeLogoutHandler, cleanup]);

  // handle initial chat setup
  useEffect(() => {
    // Exit and clean up if we dont have necessary data
    if (!selectedUserId || !user?.sub) {
      cleanup(conversationId);
      return;
    }

    // Create conversation
    conversationFetcher.submit(
      {
        userId1: user.sub,
        userId2: selectedUserId,
      },
      {
        method: "post",
        action: "/api/conversations/create",
      },
    );

    // Cleanup function
    return () => {
      cleanup(conversationId);
    };
  }, [selectedUserId, user?.sub]); // Runs when selected user changes or current user changes

  useEffect(() => {
    //Check if we have conversation data from the API
    if (!conversationFetcher.data?.conversationId) return;
    const newConversationId = conversationFetcher.data.conversationId;
    console.log("Setting up conversation:", newConversationId);

    // Store conversation ID in state
    setConversationId(newConversationId);

    // Join the WebSocket room for this conversation
    joinConversation(newConversationId);

    // Load existing messages
    messagesFetcher.load(`/api/messages/${newConversationId}`);

    // Logging
    console.log("Requested messages for conversation:", newConversationId);
  }, [conversationFetcher.data]);

  useEffect(() => {
    if (messagesFetcher.state === "loading") {
      console.log("Loading Messages...");
      return;
    }

    if (messagesFetcher.data?.messages && conversationId) {
      setConversationMessages(conversationId, messagesFetcher.data.messages);
      scrollToBottom(true);
    }

    console.groupEnd();
  }, [messagesFetcher.data]);

  useEffect(() => {
    // Access serializedMessage only if it exists in sendMessageFetcher.data
    if (sendMessageFetcher.data?.serializedMessage && conversationId) {
      const { serializedMessage } = sendMessageFetcher.data;

      // Add the new message to the messages list
      addMessage(conversationId, serializedMessage);

      // Send the message via the context
      sendMessage({
        content: serializedMessage.content,
        conversationId: serializedMessage.conversationId,
        senderId: serializedMessage.senderId,
      });
    }
  }, [sendMessageFetcher.data]);

  // Handle message submission. Saves message to database and emits through socket
  const handleSendMessage = async (event: React.FormEvent) => {
    console.log("Sending message to /api/messages/create");
    event.preventDefault();

    if (!messageInput.trim() || !conversationId || !user?.sub) return;

    sendMessageFetcher.submit(
      {
        content: messageInput.trim(),
        conversationId,
        senderId: user.sub,
      },
      {
        method: "post",
        action: "/api/messages/create",
      },
    );

    setMessageInput("");
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }, 0);
  };

  if (!selectedUserId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a user to start chatting</p>
      </div>
    );
  }

  const showSkeleton =
    initialLoading || componentsAreLoading || !conversationId;

  return (
    <div className="relative flex flex-col h-full bg-white">
      {showSkeleton && (
        <div className="absolute inset-0 z-10 h-full bg-white bg-opacity-100">
          <ChatBoxSkeleton />
        </div>
      )}

      <ChatHeader selectedUserId={selectedUserId} isConnected={true} />

      <MessageList
        conversationId={conversationId}
        userId={user?.sub}
        messagesEndRef={messagesEndRef}
      />
      <MessageInput
        value={messageInput}
        onChange={setMessageInput}
        onSubmit={handleSendMessage}
        disabled={!isConnected || !conversationId}
      />
    </div>
  );
}
