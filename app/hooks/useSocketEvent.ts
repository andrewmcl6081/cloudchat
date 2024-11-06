// app/hooks/useSocketEvent.ts
import { useEffect } from "react";
import { useSocketContext } from "./useSocketContext";
import type { UseSocketEventOptions } from "~/types";

// We receive these callback function arguments from UI components and they will contain code of actions that we want to take place when a specific event occurs
export function useSocketEvent({ onNewMessage, onUserJoined, onUserLeft }: UseSocketEventOptions) {
  // Get the 
  const { addNewMessageListener, removeNewMessageListener, addUserJoinedListener, removeUserJoinedListener, addUserLeftListener, removeUserLeftListener, socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;
    
    if (onNewMessage) addNewMessageListener(onNewMessage);
    if (onUserJoined) addUserJoinedListener(onUserJoined);
    if (onUserLeft) addUserLeftListener(onUserLeft);

    return () => {
      if (onNewMessage) removeNewMessageListener(onNewMessage);
      if (onUserJoined) removeUserJoinedListener(onUserJoined);
      if (onUserLeft) removeUserLeftListener(onUserLeft);
    };
  }, [socket, onNewMessage, onUserJoined, onUserLeft]);
}