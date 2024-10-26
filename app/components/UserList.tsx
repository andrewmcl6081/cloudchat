import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { Search, User as UserIcon } from 'lucide-react';
import { useAuth0 } from "@auth0/auth0-react";
import LoadingSpinner from '~/components/LoadingSpinner';
import { User } from '@prisma/client';

interface UserListProps {
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}

type ApiUser = Omit<User, "lastActive" | "createdAt" | 'updatedAt'> & {
  lastActive: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * UserList Component
 * Displays a searchable list of users with email-based search functionality.
 * Positioned on the left side of the dashboard, allows user selection for chat initiation.
 */
export default function UserList({ selectedUserId, onSelect }: UserListProps) {
  const [searchInput, setSearchInput] = useState('');
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const fetcher = useFetcher<{ users: ApiUser[] }>();
  const { user } = useAuth0();

  // Fetch all users once when component mounts
  useEffect(() => {
    if (user?.sub) {
      fetcher.load(`/api/users/search?currentUserId=${user.sub}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub]);

  // Update allUsers when data is fetched
  useEffect(() => {
    if (fetcher.data?.users) {
      setAllUsers(fetcher.data.users);
    }
  }, [fetcher.data]);

  // Get filtered users only when query is 3+ characters
  const filteredUsers = searchInput.length >= 3
  ? allUsers.filter(u => 
    u.email.toLowerCase().includes(searchInput.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchInput.toLowerCase()))
  ) : [];

  /**
   * Handler for user selection
   * Currently only updates local state - will be used for chat initiation later
   */
  const handleUserSelect = (auth0Id: string) => {
    console.log("Selected user auth0Id:", auth0Id);
    onSelect(auth0Id);
  };

  return (
    <div className="w-64 border-r border-gray-200 h-[calc(100vh-4rem)] bg-white">
      {/* Search Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        {/* Minimum character warning */}
        {searchInput.length > 0 && searchInput.length < 3 && (
          <p className="mt-1 text-xs text-gray-500">
            Type at least 3 characters to search
          </p>
        )}
      </div>

      {/* Users List Section */}
      <div className="overflow-y-auto h-[calc(100%-5rem)]">
        {/* Only show loading spinner on initial load */}
        {fetcher.state === 'loading' && allUsers.length === 0 ? (
          <div>
            <LoadingSpinner size="small"/>
          </div>
        ) : (
          <>
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user.auth0Id)}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 trnasition-colors ${
                  selectedUserId === user.id ? 'bg-blue-50' : ''
                }`}
              >
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {user.picture? (
                    <img
                    src={user.picture}
                    alt={`${user.email}'s profile`}
                    className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
            </div>
            {/* User Email */}
                <div className="flex-1 min-w-0">
                  {user.displayName && (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.displayName}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </button>
            ))}

            {/* Empty state - only show when we have search query and no results */}
            {searchInput.length >= 3 && filteredUsers.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                {`No users found matching "${searchInput}"`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}