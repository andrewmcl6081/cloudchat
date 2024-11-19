// app/components/ChatBox.tsx
import React, { useEffect, useState, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { useAuth0 } from "@auth0/auth0-react";
import type { SerializeFrom } from "@remix-run/node";
import LoadingSpinner from "~/components/LoadingSpinner";
import { UserLoaderData } from "~/routes/api.users.$userId";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { useSocketContext } from "~/hooks/useSocketContext";
import { useSocketEvent } from "~/hooks/useSocketEvent";
import { useMessages } from "~/context/MessagesContex";
import type {
  MessageWithSender,
  SendMessageResponse,
  ConversationResponse,
  MessagesResponse,
  ChatBoxProps,
} from "~/types";
import { MessageInput } from "./MessageInput";

export default function ChatBox({ selectedUserId }: ChatBoxProps) {
  // Fetchers
  const userFetcher = useFetcher<UserLoaderData>();
  const conversationFetcher = useFetcher<ConversationResponse>();
  const messagesFetcher = useFetcher<MessagesResponse>();
  const sendMessageFetcher = useFetcher<SendMessageResponse>();
  const { user } = useAuth0();

  // State management
  const [messageInput, setMessageInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Context
  const { isConnected, joinConversation, leaveConversation, sendMessage } =
    useSocketContext();
  const { addMessage, setConversationMessages, clearConversation } =
    useMessages();

  // useEffect(() => {
  //   if (isConnected) {
  //     console.log("Socket is connected. ID:", getSocketId());
  //   } else {
  //     console.log("Waiting for socket connection...");
  //   }
  // }, [isConnected, getSocketId]);

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

  // handle initial chat setup
  useEffect(() => {
    console.group("Chat Initialization Flow");
    // Exit and clean up if we dont have necessary data
    if (!selectedUserId || !user?.sub) {
      cleanup(conversationId);
      console.groupEnd();
      return;
    }

    // Load user data and create conversation in parallel
    userFetcher.load(`/api/users/${selectedUserId}`);
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
      console.groupEnd();
    };
  }, [selectedUserId, user?.sub]); // Runs when selected user changes or current user changes

  useEffect(() => {
    //Check if we have conversation data from the API
    if (!conversationFetcher.data?.conversationId) return;
    const newConversationId = conversationFetcher.data.conversationId;

    console.group("Conversation Setup Flow");
    console.log("Setting up conversation:", newConversationId);

    // Store conversation ID in state
    setConversationId(newConversationId);

    // Join the WebSocket room for this conversation
    joinConversation(newConversationId);

    // Load existing messages
    messagesFetcher.load(`/api/messages/${newConversationId}`);

    // Logging
    console.log("Requested messages for conversation:", newConversationId);
    console.groupEnd();
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

  // Handle user logout
  useEffect(() => {
    const handleLogout = () => {
      if (conversationId) {
        console.log("Logging out, leaving conversation:", conversationId);
        leaveConversation(conversationId);
        clearConversation(conversationId);
        setConversationId(null);
      }
    };

    // Listen for Auth0's logout event
    window.addEventListener("auth0:logout", handleLogout);

    return () => {
      window.removeEventListener("auth0:logout", handleLogout);
    };
  }, [conversationId]);

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

  // Handle cleanup when user changes or logs out
  const cleanup = (currentConversationId: string | null) => {
    if (currentConversationId) {
      console.log("Cleaning up conversation:", currentConversationId);
      leaveConversation(currentConversationId);
      clearConversation(currentConversationId);
      setConversationId(null);
      setMessageInput("");
    }
  };

  if (!isConnected) {
    console.log("Not connected!");
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  if (!selectedUserId || !conversationId) {
    console.log("No selectedUser or no conversationId");
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a user to start chatting</p>
      </div>
    );
  }

  const selectedUser = userFetcher.data?.user;

  // Show error state if user data couldn't be loaded
  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <p>Could not load user information</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <ChatHeader user={selectedUser} isConnected={isConnected} />

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
