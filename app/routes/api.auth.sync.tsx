import { json, type ActionFunction } from "@remix-run/node";
import { UserService } from "~/services/user.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const sub = formData.get("sub");
  const email = formData.get("email");
  const name = formData.get("name");

  if (!sub || !email) {
    throw new Error("Missing required user data");
  }

  const user = await UserService.findOrCreate({
    sub: sub.toString(),
    email: email.toString(),
    name: name?.toString(),
  });

  return json({ user });
};