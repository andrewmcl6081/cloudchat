import { json, type ActionFunction } from "@remix-run/node";
import { db } from "~/services/db/index.server";
import { MessageService } from "~/services/message.server";

/**
 * API route to create or get an existing conversation between two users
 * POST /conversations/create
 */
export const action: ActionFunction = async ({ request }) => {
  // Ensure user is authenticated
  const formData = await request.formData();
  const userId1 = formData.get("userId1");
  const userId2 = formData.get("userId2");

  console.log("Attempting to create conversation between:", { userId1, userId2 });

  if (!userId1 || !userId2) {
    throw json(
      { error: "Both user IDs are required" },
      { status: 400 }
    );
  }
  
  // Debug: Check if both users exist
  const user1 = await db.user.findUnique({ 
    where: { auth0Id: userId1.toString() } 
  });
  console.log("User 1:", user1);

  const user2 = await db.user.findUnique({ 
    where: { auth0Id: userId2.toString() } 
  });
  console.log("User 2:", user2);

  try {
    const conversationId = await MessageService.getOrCreateConversation(
      userId1.toString(),
      userId2.toString()
    );

    return json({ conversationId });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
};