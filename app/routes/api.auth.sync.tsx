import { json, type ActionFunction } from "@remix-run/node";
import { UserService } from "~/services/user/user.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const sub = formData.get("sub");
    const email = formData.get("email");
    const name = formData.get("name");
    const picture = formData.get("picture");

    if (!sub || !email) {
      return json({ error: "Missing required user data." }, { status: 400 });
    }

    const user = await UserService.findOrCreate({
      sub: sub.toString(),
      email: email.toString(),
      name: name?.toString(),
      picture: picture?.toString(),
    });

    return json({ user });
  } catch (error) {
    console.error("Sync error:", error);

    return json(
      { error: "Failed to sync user data with database." },
      { status: 500 },
    );
  }
};
