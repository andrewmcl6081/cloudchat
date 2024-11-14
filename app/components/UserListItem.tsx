import { User } from "@prisma/client";
import { SerializeFrom } from "@remix-run/node";
import { UserIcon } from "lucide-react";
import { useState } from "react";

export function UserListItem({
  user,
  isSelected,
  onSelect,
  isOnline,
}: {
  user: SerializeFrom<User>;
  isSelected: boolean;
  onSelect: () => void;
  isOnline: boolean;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex-shrink-0 relative">
        {imageError || !user.picture ? (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-gray-500" />
          </div>
        ) : (
          <img
            src={user.picture}
            alt={`${user.email}'s profile img`}
            className="w-10 h-10 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        {user.displayName && (
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.displayName}
          </p>
        )}
        <p className="text-sm text-gray-500 truncate">{user.email}</p>
      </div>
    </button>
  );
}
