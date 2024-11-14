import { useState, useEffect, useMemo } from "react";
import { useFetcher } from "@remix-run/react";
import { Search, User as UserIcon } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import LoadingSpinner from "~/components/LoadingSpinner";
import { User } from "@prisma/client";
import { SerializeFrom } from "@remix-run/node";
import { useSocketEvent } from "~/hooks/useSocketEvent";
import { UserListItem } from "~/components/UserListItem";
import type { UserListProps, UsersSearchResponse } from "~/types";

/**
 * UserList Component
 * Displays a searchable list of users with email-based search functionality.
 * Positioned on the left side of the dashboard, allows user selection for chat initiation.
 */
export default function UserList({ selectedUserId, onSelect }: UserListProps) {
  const [searchInput, setSearchInput] = useState("");
  const [allUsers, setAllUsers] = useState<SerializeFrom<User>[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const fetcher = useFetcher<UsersSearchResponse>();
  const { user } = useAuth0();

  // Set up socket event listeners for online status
  useSocketEvent({
    onInitialOnlineUsers: (users) => {
      console.log("Received initial online users:", users);
      const userSet = new Set(users.map((user) => user.userId));
      setOnlineUsers(userSet);
    },
    onUserStatus: (data) => {
      console.log("User status changed:", data);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (data.status === "online") {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }

        return newSet;
      });
    },
  });

  // Fetch all users once when component mounts
  useEffect(() => {
    if (user?.sub) {
      fetcher.load(`/api/users/search?currentUserId=${user.sub}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub]);

  // Update allUsers when data is fetched
  useEffect(() => {
    console.log("USERS:", fetcher.data?.users);
    if (fetcher.data?.users) {
      setAllUsers(fetcher.data.users);
    }
  }, [fetcher.data]);

  // Group and sort users based on online status and search
  const groupedUsers = useMemo(() => {
    if (searchInput.length < 3) return { online: [], offline: [] };

    // Apply search filter if needed
    const filteredUsers =
      searchInput.length >= 3
        ? allUsers.filter(
            (u) =>
              u.email.toLowerCase().includes(searchInput.toLowerCase()) ||
              u.displayName?.toLowerCase().includes(searchInput.toLowerCase()),
          )
        : allUsers;

    // Split into online/offline groups
    const online = filteredUsers.filter((user) =>
      onlineUsers.has(user.auth0Id),
    );
    const offline = filteredUsers.filter(
      (user) => !onlineUsers.has(user.auth0Id),
    );

    // Sort both groups by email
    const sortByEmail = (a: SerializeFrom<User>, b: SerializeFrom<User>) =>
      a.email.localeCompare(b.email);

    return {
      online: online.sort(sortByEmail),
      offline: offline.sort(sortByEmail),
    };
  }, [allUsers, onlineUsers, searchInput]);

  // Handler for user selection
  //Currently only updates local state - will be used for chat initiation later
  const handleUserSelect = (auth0Id: string) => {
    console.log("Selected user auth0Id:", auth0Id);
    onSelect(auth0Id);
  };

  if (fetcher.state === "loading" && allUsers.length === 0) {
    return (
      <div className="w-64 border-r border-gray-200 h-[calc(100vh-4rem)] bg-white flex items-center justify-center">
        <LoadingSpinner size="small" />
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 h-[calc(100vh-4rem)] bg-white">
      {/* Search Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
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
        {/* Online Users Section */}
        {groupedUsers.online.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 border-y border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Online ({groupedUsers.online.length})
              </span>
            </div>
            {groupedUsers.online.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                isSelected={selectedUserId === user.auth0Id}
                onSelect={() => handleUserSelect(user.auth0Id)}
                isOnline={true}
              />
            ))}
          </div>
        )}

        {/* Offline Users Section */}
        {groupedUsers.offline.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 border-y border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Offline ({groupedUsers.offline.length})
              </span>
            </div>
            {groupedUsers.offline.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                isSelected={selectedUserId === user.auth0Id}
                onSelect={() => handleUserSelect(user.auth0Id)}
                isOnline={false}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {searchInput.length >= 3 &&
          groupedUsers.online.length === 0 &&
          groupedUsers.offline.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              {`No users found matching "${searchInput}"`}
            </div>
          )}
      </div>
    </div>
  );
}
