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
  const [messages, setMessages] = useState<SerializeFrom<MessageWithSender>[]>(
    [],
  );
  const [messageInput, setMessageInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Socket Context
  const {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    getSocketId,
  } = useSocketContext();

  useEffect(() => {
    if (isConnected) {
      console.log("Socket is connected. ID:", getSocketId());
    } else {
      console.log("Waiting for socket connection...");
    }
  }, [isConnected, getSocketId]);

  // Socket event handlers
  useSocketEvent({
    onNewMessage: (message) => {
      console.log("New Message Received:", message);
      setMessages((prevMessages) => {
        if (prevMessages.some((m) => m.id === message.id)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
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
    const response = conversationFetcher.data;
    if (!response?.conversationId) return;

    console.group("Conversation Setup Flow");
    console.log("Setting up conversation:", response.conversationId);

    // Store conversation ID in state
    setConversationId(response.conversationId);

    // Join the WebSocket room for this conversation
    joinConversation(response.conversationId);

    // Load existing messages
    messagesFetcher.load(`/api/messages/${response.conversationId}`);

    // Logging
    console.log(
      "Requested messages for conversation:",
      response.conversationId,
    );
    console.groupEnd();
  }, [conversationFetcher.data]);

  useEffect(() => {
    if (messagesFetcher.state === "loading") {
      console.log("Loading Messages...");
      return;
    }

    if (messagesFetcher.data?.messages) {
      setMessages(messagesFetcher.data.messages);
      scrollToBottom(false);
    }

    console.groupEnd();
  }, [messagesFetcher.data]);

  // Handle user logout
  useEffect(() => {
    const handleLogout = () => {
      if (conversationId) {
        console.log("Logging out, leaving conversation:", conversationId);
        leaveConversation(conversationId);
        setConversationId(null);
        setMessages([]);
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
    if (sendMessageFetcher.data && sendMessageFetcher.data.serializedMessage) {
      const { serializedMessage } = sendMessageFetcher.data;

      // Add the new message to the messages list
      setMessages((prevMessages) => [...prevMessages, serializedMessage]);

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
      setMessages([]);
      setConversationId(null);
      setMessageInput("");
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  // Render empty state when no user selected
  if (!selectedUserId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a user to start chatting</p>
      </div>
    );
  }

  // Show loading state while fetching user data
  if (userFetcher.state === "loading") {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  const selectedUser = userFetcher.data?.user;

  // Show error state if user data couldn't be loaded
  if (!selectedUser) {
    console.log("Selected user:", userFetcher);
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
        messages={messages}
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
