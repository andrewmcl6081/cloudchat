// app/components/ChatBox.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useFetcher } from '@remix-run/react';
import { useAuth0 } from "@auth0/auth0-react";
import { SerializeFrom } from "@remix-run/node";
import LoadingSpinner from '~/components/LoadingSpinner';
import { UserLoaderData } from '~/routes/api.users.$userId';
import { socketService } from '~/services/socket/socket.client';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import type { 
  MessageWithSender, 
  SendMessageResponse, 
  ConversationResponse, 
  MessagesResponse, 
  ChatBoxProps 
} from '~/types';
import { MessageInput } from './MessageInput';

export default function ChatBox({ selectedUserId }: ChatBoxProps) {
  // Fetchers
  const userFetcher = useFetcher<UserLoaderData>();
  const conversationFetcher = useFetcher<ConversationResponse>();
  const messagesFetcher = useFetcher<MessagesResponse>();
  const sendMessageFetcher = useFetcher<SendMessageResponse>();
  const { user } = useAuth0();
  
  // State management
  const [messages, setMessages] = useState<SerializeFrom<MessageWithSender>[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, 0);
  };

  // Handle cleanup when user changes or logs out
  const cleanup = (currentConversationId: string | null) => {
    if (currentConversationId) {
      console.log("Cleaning up conversation:", currentConversationId);
      socketService.leaveConversation(currentConversationId);
      setMessages([]);
      setConversationId(null);
      setMessageInput("");
    }
  }

  // handle initial chat setup
  useEffect(() => {
    // Store current conversationId for cleanup
    const currentConvId = conversationId;

    // Exit and clean up if we dont have necessary data
    if (!selectedUserId || !user?.sub) {
      cleanup(currentConvId);
      return;
    }

    const initializeChat = async () => {
      console.group("Chat Intialization Flow");
      try {
        // Always cleanup previous conversation before starting a new one
        if (currentConvId) {
          cleanup(currentConvId);
        }

        // Connect to WebSocket (initialize new conversation)
        socketService.connect();

        // Load user and conversation data
        userFetcher.load(`/api/users/${selectedUserId}`);
        console.log("Loading user details:", selectedUserId);

        // Create or get conversation between users
        if (selectedUserId && user?.sub) {
          conversationFetcher.submit(
            {
              userId1: user.sub,
              userId2: selectedUserId
            },
            {
              method: "post",
              action: "/api/conversations/create"
            }
          );

          console.log("Conversation request submitted");
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }
      console.groupEnd();
    }

    initializeChat();
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
    socketService.joinConversation(response.conversationId);

    // Load existing messages
    messagesFetcher.load(`/api/messages/${response.conversationId}`);

    // Logging
    console.log("Requested messages for conversation:", response.conversationId);
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

  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (message: SerializeFrom<MessageWithSender>) => {
      console.log("New Message received");
      setMessages(prevMessages => {
        if (prevMessages.some(m => m.id === message.id)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
      scrollToBottom(true);
    };

    const handleUserJoined = (data: { userId: string, conversationId: string }) => {
      console.log("User joined chat:", data);
      // Add UI feedback when user joins
    }

    const handleUserLeft = (data: {
      userId: string,
      conversationId: string,
      reason: "left" | "disconnected"
    }) => {
      console.log("User left chat:", data);
      // Add UI feedback when user leaves
    };

    // Register socket event handlers
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);

    return () => {
      // Cleanup event handlers
      socketService.removeMessageHandler(handleNewMessage);
      socketService.removeUserJoinedHandler(handleUserJoined);
      socketService.removeUserLeftHandler(handleUserLeft);
    };
  }, [conversationId]);

  useEffect(() => {
    // Only set up listeners if we have a selected user
    if (!selectedUserId || !user?.sub) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Handle connect event
    const handleConnect = () => {
      console.log("Socket connected");
      setIsConnected(true);
    }

    // Handle disconnect event
    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    }

    // Set initial connection state
    setIsConnected(socket.connected);

    // Add event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Cleanup listeners when component unmounts or selected user changes
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [selectedUserId, user?.sub]);

  // Handle user logout
  useEffect(() => {
    const handleLogout = () => {
      if (conversationId) {
        console.log("Logging out, leaving conversation:", conversationId);
        socketService.leaveConversation(conversationId);
        setConversationId(null);
        setMessages([]);
      }
    };

    // Listen for Auth0's logout event
    window.addEventListener("auth0:logout", handleLogout);

    return () => {
      window.removeEventListener("auth0:logout", handleLogout);
    }
  }, [conversationId]);

  useEffect(() => {
    // Access serializedMessage only if it exists in sendMessageFetcher.data
    if (sendMessageFetcher.data && sendMessageFetcher.data.serializedMessage) {
      const { serializedMessage } = sendMessageFetcher.data;
  
      // Add the new message to the messages list
      setMessages((prevMessages) => [...prevMessages, serializedMessage]);
  
      // Emit the message via Socket.IO to notify other clients
      socketService.getSocket()?.emit("send-message", {
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
        method: 'post',
        action: '/api/messages/create'
      }
    );

    setMessageInput('');
  };

  // Render empty state when no user selected
  if (!selectedUserId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a user to start chatting</p>
      </div>
    );
  }

  // Show loading state while fetching user data
  if (userFetcher.state === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  const selectedUser = userFetcher.data?.user;

  // Show error state if user data couldn't be loaded
  if (!selectedUser) {
    console.log("Selected user:", userFetcher)
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <p>Could not load user information</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <ChatHeader
        user={selectedUser}
        isConnected={isConnected}
      />

      <MessageList
        messages={messages}
        currentUserId={user?.sub}
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