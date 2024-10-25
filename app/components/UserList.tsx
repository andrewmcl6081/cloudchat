import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { Search, User as UserIcon } from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react";
import type { User } from "@prisma/client";
import type { UsersSearchLoaderData } from '~/routes/users.search';
import type { SerializeFrom } from '@remix-run/node';
import LoadingSpinner from '~/components/LoadingSpinner';

/**
 * UserList Component
 * Displays a searchable list of users with email-based search functionality.
 * Positioned on the left side of the dashboard, allows user selection for chat initiation.
 */
export default function UserList() {
  // State for managing the email search input
  const [emailQuery, setEmailQuery] = useState('');
  // State for tracking which user is currently selected
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // Fetcher for making API requests without navigation
  const fetcher = useFetcher<UsersSearchLoaderData>();
  // Get current user from Auth0
  const { user } = useAuth0();

  /**
   * Effect hook to handle debounced search
   * Only triggers search when:
   * 1. Email query is at least 3 characters
   * 2. Current user is available
   * Includes 300ms debounce to prevent excessive API calls
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (emailQuery.length >= 3 && user?.sub) {
        const searchParams = new URLSearchParams();
        searchParams.set('email', emailQuery);
        searchParams.set('currentUserId', user.sub);
        
        fetcher.load(`/users/search?${searchParams.toString()}`);
      }
    }, 300);

    // Cleanup timer on component unmount or query change
    return () => clearTimeout(timer);
  }, [emailQuery, user?.sub]);

  /**
   * Handler for user selection
   * Currently only updates local state - will be used for chat initiation later
   */
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <div className="w-64 border-r border-gray-200 h-[calc(100vh-4rem)] bg-white">
      {/* Search Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by email..."
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        {/* Minimum character warning */}
        {emailQuery.length > 0 && emailQuery.length < 3 && (
          <p className="mt-1 text-xs text-gray-500">
            Type at least 3 characters to search
          </p>
        )}
      </div>

      {/* Users List Section */}
      <div className="overflow-y-auto h-[calc(100%-5rem)]">
        {/* Loading State */}
        {fetcher.state === 'loading' && (
          <div className="mt-4">
            <LoadingSpinner size="small" />
          </div>
        )}

        {/* User List */}
        {fetcher.data?.users?.map((user) => (
          <button
            key={user.id}
            onClick={() => handleUserSelect(user.id)}
            className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
              selectedUserId === user.id ? 'bg-blue-50' : ''
            }`}
          >
            {/* User Avatar */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-gray-500" />
              </div>
            </div>
            {/* User Email */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </button>
        ))}

        {/* Empty State */}
        {fetcher.state !== 'loading' && 
         emailQuery.length >= 3 && 
         fetcher.data?.users?.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}