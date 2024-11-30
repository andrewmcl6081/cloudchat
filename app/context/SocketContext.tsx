import { createContext, useEffect, useState, ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import type { SocketContextType } from "~/types";
import { socketService } from "~/services/socket/socket.client";

// Create a context to provide socket functionality throughout the app
export const SocketContext = createContext<SocketContextType | undefined>(
  undefined,
);

// When using Server-Side Rendering (SSR), React code runs On the server, where sockets can't exist
// so we need default values because during SSR, we can't have real socket connections and
// before authentication completes, we can't have real socket connections
// Also if socket disconnects, we need safe fallback values
const defaultContextValue: SocketContextType = {
  socket: null,
  isConnected: false,
  joinConversation: () => undefined,
  leaveConversation: () => undefined,
  sendMessage: () => undefined,
  addNewMessageListener: () => undefined,
  removeNewMessageListener: () => undefined,
  addUserJoinedListener: () => undefined,
  removeUserJoinedListener: () => undefined,
  addUserLeftListener: () => undefined,
  removeUserLeftListener: () => undefined,
  addUserStatusListener: () => undefined,
  removeUserStatusListener: () => undefined,
  addInitialOnlineUsersListener: () => undefined,
  removeInitialOnlineUsersListener: () => undefined,
  getSocketId: () => null,
};

// Provider component that wraps part of the app that needs socket access
export function SocketProvider({ children }: { children: ReactNode }) {
  const [contextValue, setContextValue] =
    useState<SocketContextType>(defaultContextValue);
  const { isAuthenticated, isLoading, user } = useAuth0();

  useEffect(() => {
    // Skip socket initialization if:
    // Running on server, user is not authenticated, or auth state is still loading
    if (typeof window === "undefined" || !isAuthenticated || isLoading) {
      return;
    }

    // Initialize the socket and set up context values and listeners
    const socketInstance = socketService.connect({ userId: user?.sub });

    if (socketInstance) {
      // Create bound socket method references
      // These methods are provided by our socket service and handle:
      // - Room management (join/leave)
      // - Message sending
      // - Event listeners for messages and user presence
      const socketMethods = {
        joinConversation: socketService.joinConversation.bind(socketService),
        leaveConversation: socketService.leaveConversation.bind(socketService),
        sendMessage: socketService.sendMessage.bind(socketService),
        addNewMessageListener:
          socketService.addNewMessageListener.bind(socketService),
        removeNewMessageListener:
          socketService.removeNewMessageListener.bind(socketService),
        addUserJoinedListener:
          socketService.addUserJoinedListener.bind(socketService),
        removeUserJoinedListener:
          socketService.removeUserJoinedListener.bind(socketService),
        addUserLeftListener:
          socketService.addUserLeftListener.bind(socketService),
        removeUserLeftListener:
          socketService.removeUserLeftListener.bind(socketService),
        addUserStatusListener:
          socketService.addUserStatusListener.bind(socketService),
        removeUserStatusListener:
          socketService.removeUserStatusListener.bind(socketService),
        addInitialOnlineUsersListener:
          socketService.addInitialOnlineUsersListener.bind(socketService),
        removeInitialOnlineUsersListener:
          socketService.removeInitialOnlineUsersListener.bind(socketService),
        getSocketId: socketService.getSocketId.bind(socketService),
      };

      // Update context value when socket connects
      socketInstance.on("connect", () => {
        // Provide actual working methods now to all children components
        setContextValue({
          ...socketMethods,
          socket: socketInstance,
          isConnected: true,
        });
      });

      // Update context value when socket disconnects
      socketInstance.on("disconnect", () => {
        setContextValue((prev) => ({
          ...prev,
          isConnected: false,
        }));
      });

      socketInstance.on("system:status", (data) => {
        console.log("System status:", data);
        // You might want to show a notification or update UI state
        if (data.type === "redis" && data.status === "disconnected") {
          // Handle Redis disconnection, e.g., show a notification
          // You could use a toast notification library or update some UI state
          console.warn("Redis connection lost:", data.message);
        }
      });

      // If socket is already connected when setting up listeners,
      // immediately update the context with connected state
      if (socketInstance.connected) {
        setContextValue({
          ...socketMethods,
          socket: socketInstance,
          isConnected: true,
        });
      }
    }

    // Cleanup function runs when:
    // - Component unmounts
    // - Authentication state changes
    // - Auth loading state changes
    return () => {
      console.log("Disconnecting from socket...");
      socketService.disconnect();
      setContextValue(defaultContextValue);
    };
  }, [isAuthenticated, isLoading, user?.sub]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
