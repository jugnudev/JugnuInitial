import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { communitiesStorage } from './communities-supabase';
import { nanoid } from 'nanoid';

// Types for WebSocket messages
interface WSMessage {
  type: 'auth' | 'message' | 'typing' | 'typing_stop' | 'ping' | 'error';
  payload?: any;
}

interface AuthPayload {
  token: string;
  communityId: string;
}

interface MessagePayload {
  content: string;
  isAnnouncement?: boolean;
}

interface TypingPayload {
  isTyping: boolean;
}

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  communityId: string;
  userName: string;
  userRole: string;
  lastActivity: Date;
  isTyping: boolean;
}

// Track online users per community
const communityRooms = new Map<string, Set<string>>(); // communityId -> Set of userIds
const authenticatedClients = new Map<WebSocket, AuthenticatedClient>();
const userIdToClients = new Map<string, Set<WebSocket>>(); // userId -> Set of WebSockets

export function startChatServer() {
  const port = parseInt(process.env.WS_PORT || '3001');
  const wss = new WebSocketServer({ port });

  console.log(`🚀 WebSocket chat server started on port ${port}`);

  // Cleanup typing indicators periodically
  setInterval(() => {
    authenticatedClients.forEach((client) => {
      if (client.isTyping && Date.now() - client.lastActivity.getTime() > 5000) {
        client.isTyping = false;
        broadcastTypingStatus(client.communityId, client.userId, client.userName, false);
      }
    });
  }, 5000);

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] New connection');
    
    // Send initial ping to check connection
    ws.send(JSON.stringify({ type: 'ping' }));

    // Set up ping/pong to detect disconnections
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('pong', () => {
      const client = authenticatedClients.get(ws);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            await handleAuth(ws, message.payload as AuthPayload);
            break;
            
          case 'message':
            await handleMessage(ws, message.payload as MessagePayload);
            break;
            
          case 'typing':
            handleTyping(ws, true);
            break;
            
          case 'typing_stop':
            handleTyping(ws, false);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            ws.send(JSON.stringify({ type: 'error', payload: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('[WS] Error handling message:', error);
        ws.send(JSON.stringify({ type: 'error', payload: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });
  });

  async function handleAuth(ws: WebSocket, payload: AuthPayload) {
    try {
      const { token, communityId } = payload;

      // Verify token and get user
      const session = await communitiesStorage.getSessionByToken(token);
      if (!session) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Invalid authentication token' }));
        ws.close();
        return;
      }

      const user = await communitiesStorage.getUserById(session.userId);
      if (!user) {
        ws.send(JSON.stringify({ type: 'error', payload: 'User not found' }));
        ws.close();
        return;
      }

      // Check community membership
      const membership = await communitiesStorage.getCommunityMembership(communityId, user.id);
      if (!membership || membership.status !== 'approved') {
        ws.send(JSON.stringify({ type: 'error', payload: 'Not a member of this community' }));
        ws.close();
        return;
      }

      // Get community details
      const community = await communitiesStorage.getCommunityById(communityId);
      if (!community) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Community not found' }));
        ws.close();
        return;
      }

      // Store authenticated client
      const client: AuthenticatedClient = {
        ws,
        userId: user.id,
        communityId,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: membership.role,
        lastActivity: new Date(),
        isTyping: false,
      };

      authenticatedClients.set(ws, client);

      // Track user's WebSocket connections
      if (!userIdToClients.has(user.id)) {
        userIdToClients.set(user.id, new Set());
      }
      userIdToClients.get(user.id)!.add(ws);

      // Add user to community room
      if (!communityRooms.has(communityId)) {
        communityRooms.set(communityId, new Set());
      }
      communityRooms.get(communityId)!.add(user.id);

      // Send success response
      ws.send(JSON.stringify({
        type: 'auth_success',
        payload: {
          userId: user.id,
          userName: client.userName,
          userRole: membership.role,
          communityName: community.name,
          chatMode: community.chatMode,
          slowmodeSeconds: community.chatSlowmodeSeconds,
        }
      }));

      // Send online users list
      const onlineUsers = await getOnlineUsers(communityId);
      ws.send(JSON.stringify({
        type: 'online_users',
        payload: onlineUsers
      }));

      // Broadcast user joined
      broadcastToRoom(communityId, {
        type: 'user_joined',
        payload: {
          userId: user.id,
          userName: client.userName
        }
      }, ws);

      // Send recent chat history
      const messages = await communitiesStorage.getChatHistory(communityId, 50, 0);
      ws.send(JSON.stringify({
        type: 'chat_history',
        payload: messages
      }));

    } catch (error) {
      console.error('[WS] Auth error:', error);
      ws.send(JSON.stringify({ type: 'error', payload: 'Authentication failed' }));
      ws.close();
    }
  }

  async function handleMessage(ws: WebSocket, payload: MessagePayload) {
    const client = authenticatedClients.get(ws);
    if (!client) {
      ws.send(JSON.stringify({ type: 'error', payload: 'Not authenticated' }));
      return;
    }

    try {
      // Get community to check chat settings
      const community = await communitiesStorage.getCommunityById(client.communityId);
      if (!community) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Community not found' }));
        return;
      }

      // Check chat permissions
      const canSendMessage = checkChatPermission(community.chatMode, client.userRole);
      if (!canSendMessage) {
        ws.send(JSON.stringify({ type: 'error', payload: 'You do not have permission to send messages' }));
        return;
      }

      // Check slowmode
      if (community.chatSlowmodeSeconds > 0 && client.userRole !== 'owner' && client.userRole !== 'moderator') {
        const lastMessage = await communitiesStorage.getLastUserMessage(client.communityId, client.userId);
        if (lastMessage) {
          const secondsSinceLastMessage = (Date.now() - new Date(lastMessage.createdAt).getTime()) / 1000;
          if (secondsSinceLastMessage < community.chatSlowmodeSeconds) {
            const waitTime = Math.ceil(community.chatSlowmodeSeconds - secondsSinceLastMessage);
            ws.send(JSON.stringify({ 
              type: 'error', 
              payload: `Please wait ${waitTime} seconds before sending another message` 
            }));
            return;
          }
        }
      }

      // Auto-moderation for banned words
      if (community.autoModeration && community.bannedWords?.length > 0) {
        const contentLower = payload.content.toLowerCase();
        for (const word of community.bannedWords) {
          if (contentLower.includes(word.toLowerCase())) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              payload: 'Your message contains inappropriate content' 
            }));
            return;
          }
        }
      }

      // Save message to database
      const savedMessage = await communitiesStorage.saveChatMessage(
        client.communityId,
        client.userId,
        payload.content,
        payload.isAnnouncement || false
      );

      // Broadcast message to room
      broadcastToRoom(client.communityId, {
        type: 'new_message',
        payload: {
          ...savedMessage,
          userName: client.userName,
          userRole: client.userRole
        }
      });

      // Reset typing indicator
      if (client.isTyping) {
        client.isTyping = false;
        broadcastTypingStatus(client.communityId, client.userId, client.userName, false);
      }

    } catch (error) {
      console.error('[WS] Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', payload: 'Failed to send message' }));
    }
  }

  function handleTyping(ws: WebSocket, isTyping: boolean) {
    const client = authenticatedClients.get(ws);
    if (!client) return;

    client.isTyping = isTyping;
    client.lastActivity = new Date();

    broadcastTypingStatus(client.communityId, client.userId, client.userName, isTyping);
  }

  function handleDisconnect(ws: WebSocket) {
    const client = authenticatedClients.get(ws);
    if (!client) return;

    console.log(`[WS] User ${client.userName} disconnected from community ${client.communityId}`);

    // Remove from authenticated clients
    authenticatedClients.delete(ws);

    // Remove from user's WebSocket set
    const userSockets = userIdToClients.get(client.userId);
    if (userSockets) {
      userSockets.delete(ws);
      
      // If user has no more connections, remove from online users
      if (userSockets.size === 0) {
        userIdToClients.delete(client.userId);
        
        // Remove from community room
        const room = communityRooms.get(client.communityId);
        if (room) {
          room.delete(client.userId);
          if (room.size === 0) {
            communityRooms.delete(client.communityId);
          }
        }

        // Broadcast user left
        broadcastToRoom(client.communityId, {
          type: 'user_left',
          payload: {
            userId: client.userId,
            userName: client.userName
          }
        });
      }
    }

    // Clear typing indicator if needed
    if (client.isTyping) {
      broadcastTypingStatus(client.communityId, client.userId, client.userName, false);
    }
  }

  function broadcastToRoom(communityId: string, message: any, excludeWs?: WebSocket) {
    authenticatedClients.forEach((client, ws) => {
      if (client.communityId === communityId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  function broadcastTypingStatus(communityId: string, userId: string, userName: string, isTyping: boolean) {
    broadcastToRoom(communityId, {
      type: 'typing_status',
      payload: {
        userId,
        userName,
        isTyping
      }
    });
  }

  async function getOnlineUsers(communityId: string): Promise<any[]> {
    const room = communityRooms.get(communityId);
    if (!room || room.size === 0) return [];

    const onlineUsers = [];
    for (const userId of room) {
      const user = await communitiesStorage.getUserById(userId);
      if (user) {
        const membership = await communitiesStorage.getCommunityMembership(communityId, userId);
        onlineUsers.push({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: membership?.role || 'member',
        });
      }
    }
    return onlineUsers;
  }

  function checkChatPermission(chatMode: string, userRole: string): boolean {
    switch (chatMode) {
      case 'disabled':
        return false;
      case 'owner_only':
        return userRole === 'owner';
      case 'moderators_only':
        return userRole === 'owner' || userRole === 'moderator';
      case 'all_members':
        return true;
      default:
        return false;
    }
  }

  return wss;
}