import { json, type ActionFunction } from "@remix-run/node";
import { MessageService } from "~/services/message.server";
import type { CreateMessagePayload, MessageError, SendMessageResponse } from "~/types";

// POST /api/messages/create
// Creates a new message and broadcasts it via Socket.IO
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const content = formData.get("content");
  const conversationId = formData.get("conversationId");
  const senderId = formData.get("senderId");

  // Validate required fields
  if (!content || !conversationId || !senderId) {
    throw json<MessageError>(
      { error: "Content, conversation ID, and sender ID are required" },
      { status: 400 }
    );
  }

  try {
    // Create message in database
    const message = await MessageService.createMessage({
      content: content.toString(),
      conversationId: conversationId.toString(),
      senderId: senderId.toString(),
    } as CreateMessagePayload);

    const serializedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      sender: {
        ...message.sender,
        createdAt: message.sender.createdAt.toISOString(),
        updatedAt: message.sender.updatedAt.toISOString(),
        lastActive: message.sender.lastActive.toISOString(),
      }
    };

    return json<SendMessageResponse>({ serializedMessage });
  } catch (error) {
    console.error("Failed to create message:", error);
    throw json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
};