import { User } from "@prisma/client";
import { SerializeFrom } from "@remix-run/node";

export interface UserListProps {
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
}

export interface UsersSearchResponse {
  users: SerializeFrom<User>[];
}
