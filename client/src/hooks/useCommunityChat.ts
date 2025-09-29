import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  content: string;
  author_id: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  created_at: string;
  is_announcement: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
}

interface TypingUser {
  userId: string;
  userName: string;
}

interface OnlineUser {
  userId: string;
  userName: string;
  userRole: string;
}

export function useCommunityChat(communityId: string, token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const { toast } = useToast();

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!token || !communityId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/chat`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to chat server');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        
        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          payload: { token, communityId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'auth_success':
              console.log('[WS] Authentication successful');
              // Load initial messages
              break;
              
            case 'message':
              setMessages(prev => [...prev, data.payload]);
              break;
              
            case 'message_history':
              setMessages(data.payload.messages || []);
              break;
              
            case 'online_users':
              setOnlineUsers(data.payload.users || []);
              break;
              
            case 'user_joined':
              setOnlineUsers(prev => {
                if (!prev.find(u => u.userId === data.payload.userId)) {
                  return [...prev, data.payload];
                }
                return prev;
              });
              break;
              
            case 'user_left':
              setOnlineUsers(prev => prev.filter(u => u.userId !== data.payload.userId));
              break;
              
            case 'typing_status':
              setTypingUsers(prev => {
                const filtered = prev.filter(u => u.userId !== data.payload.userId);
                if (data.payload.isTyping) {
                  return [...filtered, { userId: data.payload.userId, userName: data.payload.userName }];
                }
                return filtered;
              });
              break;
              
            case 'message_deleted':
              setMessages(prev => prev.map(msg => 
                msg.id === data.payload.messageId 
                  ? { ...msg, is_deleted: true }
                  : msg
              ));
              break;
              
            case 'message_pinned':
              setMessages(prev => prev.map(msg => 
                msg.id === data.payload.messageId 
                  ? { ...msg, is_pinned: data.payload.isPinned }
                  : msg
              ));
              break;
              
            case 'error':
              console.error('[WS] Server error:', data.payload);
              if (data.payload.includes('authentication failed')) {
                toast({
                  title: "Connection Error",
                  description: "Authentication failed. Please refresh the page.",
                  variant: "destructive"
                });
              }
              break;
              
            case 'pong':
              // Keep-alive response
              break;
          }
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected from chat server');
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setIsConnecting(false);
      };
    } catch (error) {
      console.error('[WS] Failed to connect:', error);
      setIsConnecting(false);
    }
  }, [token, communityId, toast]);

  // Send a message
  const sendMessage = useCallback((content: string, isAnnouncement = false) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to chat server. Please wait...",
        variant: "destructive"
      });
      return false;
    }

    // Check for slowmode (client-side check, server validates too)
    const now = Date.now();
    const timeSinceLastMessage = now - lastSentTime;
    if (timeSinceLastMessage < 1000) { // Basic rate limit
      return false;
    }

    wsRef.current.send(JSON.stringify({
      type: 'message',
      payload: { content, isAnnouncement }
    }));
    
    setLastSentTime(now);
    return true;
  }, [lastSentTime, toast]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: isTyping ? 'typing' : 'typing_stop'
    }));

    // Auto-stop typing after 5 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 5000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setMessages([]);
    setOnlineUsers([]);
    setTypingUsers([]);
  }, []);

  // Auto-connect when token/communityId changes
  useEffect(() => {
    if (token && communityId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token, communityId, connect, disconnect]);

  // Keep-alive ping
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, []);

  return {
    messages,
    onlineUsers,
    typingUsers,
    isConnected,
    isConnecting,
    sendMessage,
    sendTyping,
    connect,
    disconnect
  };
}