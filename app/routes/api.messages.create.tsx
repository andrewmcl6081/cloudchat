// app/routes/api.messages.create.tsx
import { json, type ActionFunction } from "@remix-run/node";
import { MessageService } from "~/services/message.server";
import { SocketServer } from "~/server/socket.server";

/**
 * POST /api/messages/create
 * Creates a new message and broadcasts it via Socket.IO
 */
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const content = formData.get("content");
  const conversationId = formData.get("conversationId");
  const senderId = formData.get("senderId");

  // Validate required fields
  if (!content || !conversationId || !senderId) {
    throw json(
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
    });

    // Initialize services
    const socketServer = SocketServer.getInstance();

    // Broadcast message via Socket.IO
    socketServer.emit('new-message', conversationId.toString(), message);

    return json({ message });
  } catch (error) {
    console.error("Failed to create message:", error);
    throw json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
};