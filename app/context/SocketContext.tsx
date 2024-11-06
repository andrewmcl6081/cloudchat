// // app/context/SocketContext.tsx
// import { createContext, useEffect, useState, ReactNode } from "react";
// import { socketService } from "~/services/socket/socket.client";
// import { useAuth0 } from "@auth0/auth0-react";
// import { useLocation } from "@remix-run/react";
// import type { SocketContextType } from "~/types";

// // Create the context
// export const SocketContext = createContext<SocketContextType | undefined>(undefined);

// // The provider component that wraps the app
// export function SocketProvider({ children }: { children: ReactNode }) {
//   const [isConnected, setIsConnected] = useState(false);
//   const [contextValue, setContextValue] = useState<SocketContextType | null>(null);
//   const { isAuthenticated, isLoading } = useAuth0();
//   const location = useLocation();

//   const shouldInitializeSocket = isAuthenticated && !isLoading && location.pathname !== "/login";

//   useEffect(() => {
//     console.log("Initializing socket connection...");

//     // Only initialize socket if authenticated and not on login page
//     if (!shouldInitializeSocket || typeof window === "undefined") {
//       return;
//     }

//     if (socketService.getSocket()?.connected) {
//       console.log("Socket already connected, skipping initialization.");
//       return;
//     }

//     // Initialize socket connection using the singleton instance
//     const socketInstance = socketService.connect();

//     const handleConnect = () => {
//       console.log("Socket connected with ID:", socketService.getSocketId());
//       setIsConnected(true);
//     };

//     const handleDisconnect = () => {
//       console.log("Socket disconnected, previous ID:", socketService.getSocketId());
//       setIsConnected(false);
//     };

//     const handleError = (error: unknown) => {
//       console.log("Socket encountered error connecting:", error);
//       setIsConnected(false);
//     }

//     // Set initial connection state
//     setIsConnected(socketInstance?.connected ?? false);

//     // Set up connection status listeners
//     if (socketInstance) {
//       socketInstance.on("connect", handleConnect);
//       socketInstance.on("disconnect", handleDisconnect);
//       socketInstance.on("connect_error", handleError);
//     }

//     // Create the context value
//     setContextValue({
//       socket: socketInstance,
//       isConnected,
//       joinConversation: (conversationId: string) => socketService.joinConversation(conversationId),
//       leaveConversation: (conversationId: string) => socketService.leaveConversation(conversationId),
//       sendMessage: (data: { content: string; conversationId: string; senderId: string }) => socketService.sendMessage(data),
//       addNewMessageListener: socketService.addNewMessageListener.bind(socketService),
//       removeNewMessageListener: socketService.removeNewMessageListener.bind(socketService),
//       addUserJoinedListener: socketService.addUserJoinedListener.bind(socketService),
//       removeUserJoinedListener: socketService.removeUserJoinedListener.bind(socketService),
//       addUserLeftListener: socketService.addUserLeftListener.bind(socketService),
//       removeUserLeftListener: socketService.removeUserLeftListener.bind(socketService),
//       getSocketId: socketService.getSocketId.bind(socketService),
//     });

//     // Cleanup function
//     return () => {
//       socketInstance?.off("connect", handleConnect);
//       socketInstance?.off("disconnect", handleDisconnect);
//       socketInstance?.off("connect_error", handleError);
//       socketService.disconnect();
//     };
//   }, [shouldInitializeSocket]);

//   useEffect(() => {
//     if (!isAuthenticated && contextValue) {
//       console.log("User logged out, disconnecting socket...");
//       setContextValue(null);
//       setIsConnected(false);
//       socketService.disconnect();
//     }
//   }, [isAuthenticated]);

//   const defaultContextValue: SocketContextType = {
//     socket: null,
//     isConnected: false,
//     joinConversation: () => undefined,
//     leaveConversation: () => undefined,
//     sendMessage: () => undefined,
//     addNewMessageListener: () => undefined,
//     removeNewMessageListener: () => undefined,
//     addUserJoinedListener: () => undefined,
//     removeUserJoinedListener: () => undefined,
//     addUserLeftListener: () => undefined,
//     removeUserLeftListener: () => undefined,
//     getSocketId: () => null,
//   };

//   return (
//     <SocketContext.Provider value={contextValue || defaultContextValue}>
//       {children}
//     </SocketContext.Provider>
//   );
// }

// import { createContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef} from "react";
// import { socketService } from "~/services/socket/socket.client";
// import { useAuth0 } from "@auth0/auth0-react";
// import { useLocation } from "@remix-run/react";
// import type { SocketContextType } from "~/types";

// export const SocketContext = createContext<SocketContextType | undefined>(undefined);

// // Default context value that's safe for SSR
// const defaultContextValue: SocketContextType = {
//   socket: null,
//   isConnected: false,
//   joinConversation: () => undefined,
//   leaveConversation: () => undefined,
//   sendMessage: () => undefined,
//   addNewMessageListener: () => undefined,
//   removeNewMessageListener: () => undefined,
//   addUserJoinedListener: () => undefined,
//   removeUserJoinedListener: () => undefined,
//   addUserLeftListener: () => undefined,
//   removeUserLeftListener: () => undefined,
//   getSocketId: () => null,
// };

// export function SocketProvider({ children }: { children: ReactNode }) {
//   const [isClient, setIsClient] = useState(false);
//   const [isConnected, setIsConnected] = useState(false);
//   const { isAuthenticated, isLoading } = useAuth0();
//   const location = useLocation();
//   const hasInitialized = useRef(false);
  
//   // Set isClient on mount
//   useEffect(() => {
//     setIsClient(true);
//   }, []);

//   const handleConnect = useCallback(() => {
//     console.log("Socket connected with ID:", socketService?.getSocketId());
//     setIsConnected(true);
//   }, []);

//   const handleDisconnect = useCallback(() => {
//     console.log("Socket disconnected, previous ID:", socketService?.getSocketId());
//     setIsConnected(false);
//   }, []);

//   const handleError = useCallback((error: unknown) => {
//     console.log("Socket encountered error connecting:", error);
//     setIsConnected(false);
//   }, []);

//   const shouldInitializeSocket = isClient && isAuthenticated && !isLoading && location.pathname !== "/login" && !hasInitialized.current;

//   // All socket-related callbacks only initialized on client
//   const socketMethods = useMemo(() => {
//     if (!isClient || !shouldInitializeSocket) return defaultContextValue;

//     return {
//       joinConversation: socketService.joinConversation.bind(socketService),
//       leaveConversation: socketService.leaveConversation.bind(socketService),
//       sendMessage: socketService.sendMessage.bind(socketService),
//       addNewMessageListener: socketService.addNewMessageListener.bind(socketService),
//       removeNewMessageListener: socketService.removeNewMessageListener.bind(socketService),
//       addUserJoinedListener: socketService.addUserJoinedListener.bind(socketService),
//       removeUserJoinedListener: socketService.removeUserJoinedListener.bind(socketService),
//       addUserLeftListener: socketService.addUserLeftListener.bind(socketService),
//       removeUserLeftListener: socketService.removeUserLeftListener.bind(socketService),
//       getSocketId: socketService.getSocketId.bind(socketService)
//     };
//   }, [isClient, shouldInitializeSocket]);

//   const contextValue = useMemo<SocketContextType>(() => {
//     if (!isClient || !shouldInitializeSocket) return defaultContextValue;

//     return {
//       socket: socketService.getSocket(),
//       isConnected,
//       ...socketMethods,
//     };
//   }, [isClient, isConnected, socketMethods, shouldInitializeSocket]);

//   // Handle socket initialization
//   useEffect(() => {
//     if (!shouldInitializeSocket || typeof window === "undefined") {
//       return;
//     }

//     console.log("Initializing socket connection...");
//     hasInitialized.current = true;

//     const socketInstance = socketService.connect();

//     if (socketInstance) {
//       socketInstance.on("connect", handleConnect);
//       socketInstance.on("disconnect", handleDisconnect);
//       socketInstance.on("connect_error", handleError);

//       if (socketInstance.connected) {
//         setIsConnected(true);
//       }
//     }

//     return () => {
//       if (socketInstance) {
//         socketInstance.off("connect", handleConnect);
//         socketInstance.off("disconnect", handleDisconnect);
//         socketInstance.off("connect_error", handleError);
//         socketService.disconnect();
//       }
//     };
//   }, [shouldInitializeSocket, handleConnect, handleDisconnect, handleError]);

//   // Handle cleanup on logout
//   useEffect(() => {
//     if (!isAuthenticated && hasInitialized.current) {
//       console.log("User logged out, disconnecting socket...");
//       socketService.disconnect();
//       hasInitialized.current = false;
//       setIsConnected(false);
//     }
//   }, [isAuthenticated]);

//   return (
//     <SocketContext.Provider value={contextValue}>
//       {children}
//     </SocketContext.Provider>
//   );
// }

// import { createContext, useEffect, useState, ReactNode } from "react";
// import { socketService } from "~/services/socket/socket.client";
// import { useAuth0 } from "@auth0/auth0-react";
// import { useLocation } from "@remix-run/react";
// import type { SocketContextType } from "~/types";

// export const SocketContext = createContext<SocketContextType | undefined>(undefined);

// const defaultContextValue: SocketContextType = {
//   socket: null,
//   isConnected: false,
//   joinConversation: () => undefined,
//   leaveConversation: () => undefined,
//   sendMessage: () => undefined,
//   addNewMessageListener: () => undefined,
//   removeNewMessageListener: () => undefined,
//   addUserJoinedListener: () => undefined,
//   removeUserJoinedListener: () => undefined,
//   addUserLeftListener: () => undefined,
//   removeUserLeftListener: () => undefined,
//   getSocketId: () => null,
// };

import { createContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { socketService } from "~/services/socket/socket.client";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "@remix-run/react";
import type { SocketContextType } from "~/types";

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

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
  getSocketId: () => null,
};

export function SocketProvider({ children }: { children: ReactNode }) {
  const [contextValue, setContextValue] = useState<SocketContextType>(defaultContextValue);
  const [isClient, setIsClient] = useState(false);
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();
  const hasInitialized = useRef(false);
  const socketMethodsRef = useRef<SocketContextType>(defaultContextValue);

  // Initialize client-side only code
  useEffect(() => {
    setIsClient(true);
    // Create socket methods only on client side
    socketMethodsRef.current = {
      ...defaultContextValue,
      joinConversation: socketService.joinConversation.bind(socketService),
      leaveConversation: socketService.leaveConversation.bind(socketService),
      sendMessage: socketService.sendMessage.bind(socketService),
      addNewMessageListener: socketService.addNewMessageListener.bind(socketService),
      removeNewMessageListener: socketService.removeNewMessageListener.bind(socketService),
      addUserJoinedListener: socketService.addUserJoinedListener.bind(socketService),
      removeUserJoinedListener: socketService.removeUserJoinedListener.bind(socketService),
      addUserLeftListener: socketService.addUserLeftListener.bind(socketService),
      removeUserLeftListener: socketService.removeUserLeftListener.bind(socketService),
      getSocketId: socketService.getSocketId.bind(socketService),
    };
  }, []);

  const handleConnect = useCallback(() => {
    console.log("Socket connected with ID:", socketService.getSocketId());
    setContextValue(prev => ({
      ...prev,
      ...socketMethodsRef.current,
      socket: socketService.getSocket(),
      isConnected: true,
    }));
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log("Socket disconnected, previous ID:", socketService.getSocketId());
    setContextValue(prev => ({ ...prev, isConnected: false }));
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.log("Socket encountered error connecting:", error);
    setContextValue(prev => ({ ...prev, isConnected: false }));
  }, []);

  useEffect(() => {
    if (!isClient || !isAuthenticated || isLoading || location.pathname === "/login" || hasInitialized.current) {
      return;
    }

    console.log("Initializing socket connection...");
    hasInitialized.current = true;

    const socketInstance = socketService.connect();

    if (socketInstance) {
      socketInstance.on("connect", handleConnect);
      socketInstance.on("disconnect", handleDisconnect);
      socketInstance.on("connect_error", handleError);

      if (socketInstance.connected) {
        handleConnect();
      }
    }

    return () => {
      if (socketInstance) {
        socketInstance.off("connect", handleConnect);
        socketInstance.off("disconnect", handleDisconnect);
        socketInstance.off("connect_error", handleError);
      }
    };
  }, [isClient, isAuthenticated, isLoading, location.pathname, handleConnect, handleDisconnect, handleError]);

  // Handle cleanup on unmount or logout
  useEffect(() => {
    if (!isAuthenticated && hasInitialized.current) {
      console.log("Cleaning up socket connection...");
      socketService.disconnect();
      hasInitialized.current = false;
      setContextValue(defaultContextValue);
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}