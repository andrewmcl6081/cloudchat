import React, { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { User } from "lucide-react";
import { ChatHeaderProps } from "~/types";
import type { UserLoaderData } from "~/routes/api.users.$userId";
import { useLoading } from "~/context/LoadingContext";

export function ChatHeader({ selectedUserId, isConnected }: ChatHeaderProps) {
  const userFetcher = useFetcher<UserLoaderData>();
  const { setLoading } = useLoading();

  useEffect(() => {
    if (!selectedUserId) return;

    setLoading("ChatHeader", true);
    userFetcher.load(`/api/users/${selectedUserId}`);
  }, [selectedUserId, setLoading]);

  useEffect(() => {
    if (userFetcher.state === "idle") {
      setLoading("ChatHeader", false); // Stop loading
    }
  }, [userFetcher.state, setLoading]);

  if (!userFetcher.data?.user) {
    return null;
  }

  const user = userFetcher.data.user;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.displayName || "User"}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-gray-500" />
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            {user.displayName || "User"}
          </h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm text-gray-500">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
