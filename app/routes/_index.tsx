import { useAuth0 } from "@auth0/auth0-react";
import { Link, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import LoadingSpinner from "~/components/LoadingSpinner";

export default function Index() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  // Handle navigation in useEffect, not during render
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-8 text-4xl font-bold text-gray-900">CloudChat</h1>
        <p className="mb-8 text-lg text-gray-600">
          A simple and secure way to chat with your team
        </p>
        <button
          onClick={() => loginWithRedirect()}
          className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Sign in with Auth0
        </button>
      </div>
    </div>
  );
}
