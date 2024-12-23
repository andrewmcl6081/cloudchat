import { User } from "@prisma/client";
import { json, type LoaderFunction } from "@remix-run/node";
import { UserService } from "~/services/user/user.server";

export type UsersSearchLoaderData = {
  users: User[];
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const currentUserId = url.searchParams.get("currentUserId");

  if (!currentUserId) {
    throw new Error("Current user ID is required.");
  }

  // Get all users except current user
  const users = await UserService.getAllUsers(currentUserId);
  return json({ users });
};
