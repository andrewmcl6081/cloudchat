import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "@remix-run/react";
import { useEffect } from "react";

export default function Login() {
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0();

  useEffect(() => {
    // Debug log for login state
    console.log('Login State:', { 
      isAuthenticated, 
      isLoading,
      error: error?.message 
    });
  }, [isAuthenticated, isLoading, error]);
  
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to CloudChat
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign in to continue
          </p>
        </div>
        {error && (
        <div className="text-red-600">
          Error: {error.message}
        </div>
      )}
        <button
          onClick={() => loginWithRedirect()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Sign in with Auth0
        </button>
      </div>
    </div>
  );
}