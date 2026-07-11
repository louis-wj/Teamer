export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'DND';
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
  channels: Channel[];
  members: ServerMember[];
  _count: { members: number };
}

export interface ServerMember {
  id: string;
  role: 'ADMIN' | 'MODERATOR' | 'GUEST';
  joinedAt: string;
  userId: string;
  serverId: string;
  user: User;
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE' | 'VIDEO';
  serverId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  channelId: string;
  memberId: string;
  member: ServerMember;
}
