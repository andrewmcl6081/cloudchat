import React, { useEffect } from 'react';
import { User } from 'lucide-react';
import { useFetcher } from '@remix-run/react';
import LoadingSpinner from '~/components/LoadingSpinner';
import { UserLoaderData } from '~/routes/users.$userId';

interface ChatBoxProps {
  selectedUserId: string | null;
}

export default function ChatBox({ selectedUserId }: ChatBoxProps) {
  const userFetcher = useFetcher<UserLoaderData>();

  // Fetch user data when selectedUserId changes
  useEffect(() => {
    if (selectedUserId) {
      userFetcher.load(`/users/${selectedUserId}`);
    }
  }, [selectedUserId]);

  // Show empty state when no user is selected
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
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <p>Could not load user information</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Example Messages - We'll replace these with real messages later */}
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[70%]">
            <p className="text-sm text-gray-900">Hey, how are you?</p>
            <span className="text-xs text-gray-500">10:00 AM</span>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="bg-blue-500 rounded-lg px-4 py-2 max-w-[70%]">
            <p className="text-sm text-white">I'm doing great! How about you?</p>
            <span className="text-xs text-blue-100">10:01 AM</span>
          </div>
        </div>
      </div>

      {/* Message Input Area */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}