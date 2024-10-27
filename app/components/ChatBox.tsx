// app/components/ChatBox.tsx
import React, { useEffect, useState, useRef } from 'react';
import { ReceiptRussianRuble, User } from 'lucide-react';
import { useFetcher } from '@remix-run/react';
import { useAuth0 } from "@auth0/auth0-react";
import LoadingSpinner from '~/components/LoadingSpinner';
import { UserLoaderData } from '~/routes/api.users.$userId';
import { socketService } from '~/services/socket/socket.client';
import type { MessageWithSender } from '~/services/message.server';

// Define response types for our API routes
interface ConversationResponse {
  conversationId: string;
}

interface MessagesResponse {
  messages: MessageWithSender[];
}

interface ChatBoxProps {
  selectedUserId: string | null;
}

interface MessageWithSender {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  createdAt: string | Date;  // Accept either string or Date
  updatedAt: string | Date;  // Accept either string or Date
  sender: {
    id: string;
    email: string;
    auth0Id: string;
    displayName: string | null;
    picture: string | null;
    createdAt: string | Date;  // Accept either string or Date
    updatedAt: string | Date;  // Accept either string or Date
    lastActive: string | Date; // Accept either string or Date
  };
}

export default function ChatBox({ selectedUserId }: ChatBoxProps) {
  // Fetchers with proper type definitions
  const userFetcher = useFetcher<UserLoaderData>();
  const messageFetcher = useFetcher<ConversationResponse>();
  const messagesFetcher = useFetcher<MessagesResponse>();
  const sendMessageFetcher = useFetcher();
  const { user } = useAuth0();
  
  // Component state
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Reference for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the bottom of the message list
  // when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // handle initial chat setup
  useEffect(() => {

    // Exit if we dont have necessary data
    if (!selectedUserId || !user?.sub) {
      // Reset state when no user is selected or no current user
      setMessages([]);
      setConversationId(null);

      return;
    }

    const initializeChat = async () => {
      console.group("Chat Intialization Flow");
      try {
        // Connect to WebSocket
        socketService.connect();
        setIsConnected(true);

        // Load selected user's profile
        userFetcher.load(`/api/users/${selectedUserId}`);
        console.log("Loading user details:", selectedUserId);

        // Create or get conversation between users
        if (selectedUserId && user?.sub) {
          messageFetcher.submit(
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

    // Cleanup: Leave conversation when unmounting or changing users
    return () => {
      if (conversationId) {
        socketService.leaveConversation(conversationId);
        setIsConnected(false);
        console.log("Left conversation:", conversationId);
      }
    }
  }, [selectedUserId, user?.sub]); // Runs when selected user changes or current user changes

  useEffect(() => {
    //Check if we have conversation data from the API
    const response = messageFetcher.data;
    if (!response?.conversationId) return;

    console.group("Conversation Setup Flow");
    console.log("Setting up conversation:", response.conversationId);

    // Store conversation ID in state
    setConversationId(response.conversationId);

    // Join the WebSocket room for this conversation
    socketService.joinConversation(response.conversationId);

    // Load existing messages
    messagesFetcher.load(`/api/messages/${response.conversationId}`);
    console.log("Requested messages for conversation:", response.conversationId);
    console.groupEnd();
  }, [messageFetcher.data]);

  useEffect(() => {
    console.group("Message Loading Flow");
    console.log("MessagesFetcher State:", messagesFetcher.state);
    console.log("MessagesFetcher Data:", messagesFetcher.data);

    if (messagesFetcher.state === "loading") {
      console.log("Loading Messages...");
      return;
    }

    const response = messagesFetcher.data;
    if (response?.messages) {
      console.log("Updating messages:", response.messages.length);
      setMessages(response.messages);
      scrollToBottom();
    }

    console.groupEnd();
  }, [messagesFetcher.data]);

  /**
   * Handle message submission
   * Saves message to database and emits through socket
   */
  const handleSendMessage = async (event: React.FormEvent) => {
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
      {/* Chat Header - Shows selected user info */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-gray-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {selectedUser.displayName || 'User'}
            </h2>
            <p className="text-sm text-gray-500">{selectedUser.email}</p>
          </div>
        </div>
      </div>

      {/* Messages Area - Displays conversation history */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.senderId === user?.sub ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[70%] ${
                message.senderId === user?.sub
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className={`text-xs ${
                message.senderId === user?.sub ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {new Date(message.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || !conversationId}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}