import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { RequireAuth } from "~/components/auth/RequireAuth";
import UserList from "~/components/UserList";

export default function Dashboard() {
  // Get user data and logout function from Auth0
  const { user, logout } = useAuth0();
  // Initialize fetcher for making POST requests without navigation
  const fetcher = useFetcher();

  useEffect(() => {
    // Only attempt to sync if we have the required user data
    if (user?.sub && user?.email) {
      // Create FormData object - this is what Remix expects
      const formData = new FormData();
      // Add user data to FormData
      formData.append("sub", user.sub);
      formData.append("email", user.email);
      // Only append name if it exists
      if (user.name) {
        formData.append("name", user.name);
      }

      // Submit the FormData to our sync endpoint
      fetcher.submit(
        formData,  // FormData object instead of plain object
        { 
          method: "post",  // Use POST method
          action: "/auth/sync"  // Endpoint to handle the sync
        }
      );
    }
  }, [user]); // Re-run effect if user object changes

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex items-center">
                <h1 className="text-xl font-bold">CloudChat</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-700">{user?.email}</span>
                <button
                  onClick={() => 
                    logout({ logoutParams: { returnTo: window.location.origin } })
                  }
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        {/* Main Content Area */}
        <div className="flex h-[calc(100vh-4rem)]">
          {/* User List Sidebar */}
          <UserList />
          
          {/* Main Chat Area - Will be replaced with chat interface later */}
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a user to start chatting</p>
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}