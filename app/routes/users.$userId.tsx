import { json, type LoaderFunction } from "@remix-run/node";
import { UserService } from "~/services/user.server";
import { User } from "@prisma/client";

// Define the type for the loader data
export type UserLoaderData = {
  user: User;
};

export const loader: LoaderFunction = async ({ params }) => {
  // Check if userId exists
  if (!params.userId) {
    throw new Response("User ID is required", { status: 400 });
  }

  const user = await UserService.findById(params.userId);
  
  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  return json<UserLoaderData>({ user });
};