import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import LoadingSpinner from "../LoadingSpinner";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    // Debug log to see auth state
    console.log('Auth State:', { 
      isAuthenticated, 
      isLoading, 
      error: error?.message 
    });

    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate, error]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return children;
}