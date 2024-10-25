import { json, type LoaderFunction } from "@remix-run/node";
import { MessageService } from "~/services/message.server";

/**
 * GET /api/messages
 * Fetches messages for a specific conversation
 */
export const loader: LoaderFunction = async ({ request }) => {

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");

  if (!conversationId) {
    throw json(
      { error: "Conversation ID is required" },
      { status: 400 }
    );
  }

  try {
    const messages = await MessageService.getConversationMessages(conversationId);
    return json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
};