import { useContext } from "react";
import { SocketContext } from "~/context/SocketContext";

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }

  return context;
}