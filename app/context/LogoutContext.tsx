import React, { createContext, useContext, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type LogoutFunction = () => void;

interface LogoutContextType {
  addLogoutHandler: (handler: LogoutFunction) => void;
  removeLogoutHandler: (handler: LogoutFunction) => void;
  handleLogout: () => void;
}

const LogoutContext = createContext<LogoutContextType | null>(null);

export function LogoutProvider({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth0();
  const logoutHandlers = React.useRef<Set<LogoutFunction>>(new Set());

  const addLogoutHandler = useCallback((handler: LogoutFunction) => {
    logoutHandlers.current.add(handler);
  }, []);

  const removeLogoutHandler = useCallback((handler: LogoutFunction) => {
    logoutHandlers.current.delete(handler);
  }, []);

  const handleLogout = useCallback(() => {
    // Execute all registered logout handlers
    logoutHandlers.current.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error("Error executing logout handler:", error);
      }
    });

    // Perform Auth0 logout
    logout({ logoutParams: { returnTo: window.location.origin } });
  }, [logout]);

  return (
    <LogoutContext.Provider
      value={{ addLogoutHandler, removeLogoutHandler, handleLogout }}
    >
      {children}
    </LogoutContext.Provider>
  );
}

// Custom hook to use the logout context
export const useLogout = () => {
  const context = useContext(LogoutContext);
  if (!context) {
    throw new Error("useLogout must be used within a LogoutProvider");
  }

  return context;
};
