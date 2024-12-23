import { json, type LoaderFunction } from "@remix-run/node";
import { UserService } from "~/services/user/user.server";
import type { User } from "@prisma/client";

export type UserLoaderData = {
  user: User;
};

// Resource Routes(GET requests using loaders)
export const loader: LoaderFunction = async ({ params, request }) => {
  const auth0Id = params.userId;
  console.log("Loader executed for auth0Id:", auth0Id);
  console.log("Request URL:", request.url);

  if (!auth0Id) {
    throw json({ error: "Auth0 ID is required" }, { status: 400 });
  }

  try {
    // Use UserService to find user by Auth0 ID
    const user = await UserService.findByAuth0Id(auth0Id);

    if (!user) {
      throw json({ error: "User not found" }, { status: 404 });
    }

    return json<UserLoaderData>({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    throw json({ error: "Failed to load user" }, { status: 500 });
  }
};
