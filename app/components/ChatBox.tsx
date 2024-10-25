// app/components/ChatBox.tsx
import React, { useEffect, useState, useRef } from 'react';
import { User } from 'lucide-react';
import { useFetcher } from '@remix-run/react';
import { useAuth0 } from "@auth0/auth0-react";
import LoadingSpinner from '~/components/LoadingSpinner';
import { UserLoaderData } from '~/routes/users.$userId';
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

  /**
   * Automatically scroll to the bottom of the message list
   * when new messages arrive
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Initialize Socket.IO connection when component mounts
   * Clean up connection when component unmounts
   */
  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(true);

    return () => {
      socketService.disconnect();
      setIsConnected(false);
    };
  }, []);

  /**
   * Create or retrieve conversation when users are selected
   * Triggers when either user changes or when socket connects
   */
  useEffect(() => {
    if (selectedUserId && user?.sub && isConnected) {
      messageFetcher.submit(
        { 
          userId1: user.sub,
          userId2: selectedUserId,
        },
        { 
          method: 'post',
          action: '/conversations/create'
        }
      );
    }
  }, [selectedUserId, user?.sub, isConnected]);

  /**
   * Handle conversation initialization after getting conversationId
   * Joins the socket room and fetches existing messages
   */
  useEffect(() => {
    const response = messageFetcher.data as ConversationResponse | undefined;
    if (response?.conversationId) {
      setConversationId(response.conversationId);
      socketService.joinConversation(response.conversationId);
      messagesFetcher.load(`/messages?conversationId=${response.conversationId}`);
    }
  }, [messageFetcher.data]);

  /**
   * Update messages state when new messages are fetched
   * Handles both initial load and new messages
   */
  useEffect(() => {
    const response = messagesFetcher.data as MessagesResponse | undefined;
    if (response?.messages) {
      setMessages(response.messages);
      scrollToBottom();
    }
  }, [messagesFetcher.data]);

  /**
   * Socket.IO message listener
   * Updates messages state when new messages arrive in real-time
   */
  useEffect(() => {
    if (!isConnected) return;

    const handleNewMessage = (message: MessageWithSender) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    };

    socketService.onNewMessage(handleNewMessage);

    // Cleanup socket listener on unmount or when connection status changes
    return () => {
      socketService.removeMessageListener(handleNewMessage);
    };
  }, [isConnected]);

  useEffect(() => {
    if (selectedUserId && user?.sub && isConnected) {
      console.log("Starting chat with users:", {
        currentUser: {
          sub: user.sub,
          email: user.email
        },
        selectedUser: selectedUserId
      });
      
      userFetcher.load(`/users/${selectedUserId}`);

      // Make sure we're sending both IDs
      const formData = new FormData();
      formData.append("userId1", user.sub);
      formData.append("userId2", selectedUserId);
  
      messageFetcher.submit(
        formData,
        { 
          method: 'post',
          action: '/conversations/create'
        }
      );
    }
  }, [selectedUserId, user?.sub, isConnected]);

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
        action: '/messages/create'
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