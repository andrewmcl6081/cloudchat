import { useEffect, useRef } from "react";
import { useSocketContext } from "./useSocketContext";
import type { UseSocketEventOptions } from "~/types";

export function useSocketEvent({ onNewMessage, onUserJoined, onUserLeft, onUserStatus, onInitialOnlineUsers }: UseSocketEventOptions) {
  // Access socket-related methods from the context
  const {
    addNewMessageListener,
    removeNewMessageListener,
    addUserJoinedListener,
    removeUserJoinedListener,
    addUserLeftListener,
    removeUserLeftListener,
    addUserStatusListener,
    removeUserStatusListener,
    addInitialOnlineUsersListener,
    removeInitialOnlineUsersListener,
  } = useSocketContext();

  // Use a ref to store event handler functions so they remain consistent between renders
  const handlersRef = useRef({ onNewMessage, onUserJoined, onUserLeft, onUserStatus, onInitialOnlineUsers });

  // Update the current ref's value whenever the handlers change
  // This does not cause a re-render, keeping the component's performance optimized
  handlersRef.current = { onNewMessage, onUserJoined, onUserLeft, onUserStatus, onInitialOnlineUsers };

  useEffect(() => {
    // Helper function to create a stable wrapper for the handlers
    // eslint-disable-next-line @typescript-eslint/ban-types
    const createHandler = (handler: Function | undefined) => {
      // Return a function that calls the handler if it exists
      return handler ? ((...args: unknown[]) => handler(...args)) : undefined;
    };

    // Create stable event handler functions using the latest handlers in the ref
    const messageHandler = createHandler(handlersRef.current.onNewMessage);
    const userJoinedHandler = createHandler(handlersRef.current.onUserJoined);
    const userLeftHandler = createHandler(handlersRef.current.onUserLeft);
    const userStatusHandler = createHandler(handlersRef.current.onUserStatus);
    const initialOnlineUsersHandler = createHandler(handlersRef.current.onInitialOnlineUsers);

    // Register event listeners if the corresponding handler is defined
    if (messageHandler) addNewMessageListener(messageHandler);
    if (userJoinedHandler) addUserJoinedListener(userJoinedHandler);
    if (userLeftHandler) addUserLeftListener(userLeftHandler);
    if (userStatusHandler) addUserStatusListener(userStatusHandler);
    if (initialOnlineUsersHandler) addInitialOnlineUsersListener(initialOnlineUsersHandler);

    // Cleanup function: Remove the event listeners when the component unmounts or dependencies change
    return () => {
      if (messageHandler) removeNewMessageListener(messageHandler);
      if (userJoinedHandler) removeUserJoinedListener(userJoinedHandler);
      if (userLeftHandler) removeUserLeftListener(userLeftHandler);
      if (userStatusHandler) removeUserStatusListener(userStatusHandler);
      if (initialOnlineUsersHandler) removeInitialOnlineUsersListener(initialOnlineUsersHandler);
    };
  }, [
    // Dependencies: These are the context methods. The effect runs only if these change.
    addNewMessageListener,
    removeNewMessageListener,
    addUserJoinedListener,
    removeUserJoinedListener,
    addUserLeftListener,
    removeUserLeftListener,
    addUserStatusListener,
    removeUserStatusListener,
    addInitialOnlineUsersListener,
    removeInitialOnlineUsersListener,
  ]);
}