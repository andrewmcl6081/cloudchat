import { json, type LoaderFunction } from "@remix-run/node";
import { UserService } from "~/services/user.server";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") || "";
  const currentUserId = url.searchParams.get("currentUserId");

  if (!currentUserId) {
    throw new Error("Current user ID is required");
  }

  // Only search if email has at least 3 characters
  const users = email.length >= 3 
    ? await UserService.searchUsers(email, currentUserId)
    : [];
    
  return json({ users });
};