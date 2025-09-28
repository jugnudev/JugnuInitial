import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useCommunityChat } from '@/hooks/useCommunityChat';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Send, 
  Pin, 
  Trash2, 
  Users, 
  MessageSquare,
  AlertCircle,
  Crown,
  Shield,
  Circle,
  Megaphone
} from 'lucide-react';

interface CommunityMember {
  role: 'owner' | 'moderator' | 'member';
  userId: string;
}

interface CommunitySettings {
  chatMode?: string;
  chatSlowmodeSeconds?: number;
}

interface CommunityChatProps {
  communityId: string;
  currentUser: any;
  currentMember?: CommunityMember;
  communitySettings?: CommunitySettings;
  authToken: string | null;
}

export default function CommunityChat({ 
  communityId, 
  currentUser, 
  currentMember,
  communitySettings,
  authToken 
}: CommunityChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [slowmodeTimer, setSlowmodeTimer] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slowmodeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  
  const {
    messages,
    onlineUsers,
    typingUsers,
    isConnected,
    isConnecting,
    sendMessage: wsSendMessage,
    sendTyping
  } = useCommunityChat(communityId, authToken);

  // Load chat history
  const { data: chatHistory, isLoading: historyLoading } = useQuery<{ messages: any[] }>({
    queryKey: ['/api/communities', communityId, 'chat/messages'],
    enabled: !!currentMember && isConnected,
  });

  // Load pinned messages
  const { data: pinnedMessages } = useQuery<{ messages: any[] }>({
    queryKey: ['/api/communities', communityId, 'chat/pinned'],
    enabled: !!currentMember && isConnected,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string, isAnnouncement?: boolean }) => {
      return apiRequest(`/api/communities/${communityId}/chat/messages`, 'POST', data);
    },
    onSuccess: () => {
      setMessageInput('');
      startSlowmodeTimer();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest(`/api/communities/${communityId}/chat/messages/${messageId}`, 'DELETE');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Pin message mutation
  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string, isPinned: boolean }) => {
      return apiRequest(`/api/communities/${communityId}/chat/messages/${messageId}/pin`, 'POST', { isPinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'chat/pinned'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to pin message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Start slowmode timer
  const startSlowmodeTimer = () => {
    if (communitySettings?.chatSlowmodeSeconds && communitySettings.chatSlowmodeSeconds > 0) {
      setSlowmodeTimer(communitySettings.chatSlowmodeSeconds);
      
      if (slowmodeIntervalRef.current) {
        clearInterval(slowmodeIntervalRef.current);
      }
      
      slowmodeIntervalRef.current = setInterval(() => {
        setSlowmodeTimer(prev => {
          if (prev <= 1) {
            if (slowmodeIntervalRef.current) {
              clearInterval(slowmodeIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Check if user can send messages
  const canSendMessage = () => {
    if (!currentMember) return false;
    
    const chatMode = communitySettings?.chatMode || 'all_members';
    
    switch (chatMode) {
      case 'disabled':
        return false;
      case 'owner_only':
        return currentMember.role === 'owner';
      case 'moderators_only':
        return currentMember.role === 'owner' || currentMember.role === 'moderator';
      case 'all_members':
        return true;
      default:
        return false;
    }
  };

  // Handle message input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      sendTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 2000);
  };

  // Handle send message
  const handleSendMessage = async (isAnnouncement = false) => {
    if (!messageInput.trim() || slowmodeTimer > 0 || !canSendMessage()) return;
    
    // Send via WebSocket for real-time update
    const sent = wsSendMessage(messageInput, isAnnouncement);
    
    if (sent) {
      // Also send via API for persistence
      await sendMessageMutation.mutate({ 
        content: messageInput, 
        isAnnouncement 
      });
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (slowmodeIntervalRef.current) {
        clearInterval(slowmodeIntervalRef.current);
      }
    };
  }, []);

  // Combine WebSocket messages with loaded history
  const allMessages = [...(chatHistory?.messages || []), ...messages].filter(
    (msg, index, self) => index === self.findIndex(m => m.id === msg.id)
  );

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'moderator':
        return <Shield className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (!currentMember) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">You must be a member to view the chat</p>
      </Card>
    );
  }

  if (communitySettings?.chatMode === 'disabled') {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Chat is currently disabled for this community</p>
      </Card>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Pinned Messages Banner */}
        {pinnedMessages && pinnedMessages.messages?.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 border-b">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">Pinned Messages</span>
            </div>
            <div className="mt-1 space-y-1">
              {pinnedMessages.messages.slice(0, 2).map((msg: any) => (
                <div key={msg.id} className="text-sm text-muted-foreground truncate">
                  {msg.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {historyLoading ? (
            <div className="text-center text-muted-foreground">Loading messages...</div>
          ) : allMessages.length === 0 ? (
            <div className="text-center text-muted-foreground">No messages yet. Start the conversation!</div>
          ) : (
            <div className="space-y-4">
              {allMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.is_announcement ? 'p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20' : ''}`}
                  data-testid={`message-${message.id}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={message.author.profile_image_url} />
                    <AvatarFallback>
                      {message.author.first_name[0]}{message.author.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {message.author.first_name} {message.author.last_name}
                      </span>
                      {renderRoleBadge(
                        onlineUsers.find(u => u.userId === message.author_id)?.userRole || 'member'
                      )}
                      {message.is_announcement && (
                        <Badge variant="secondary" className="text-xs">
                          <Megaphone className="w-3 h-3 mr-1" />
                          Announcement
                        </Badge>
                      )}
                      {message.is_pinned && (
                        <Pin className="w-3 h-3 text-yellow-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {message.is_deleted ? (
                      <p className="text-sm text-muted-foreground italic">Message deleted</p>
                    ) : (
                      <p className="text-sm mt-1 whitespace-pre-wrap">{message.content}</p>
                    )}
                    {/* Message Actions */}
                    {!message.is_deleted && (
                      <div className="flex items-center gap-2 mt-2 opacity-0 hover:opacity-100 transition-opacity">
                        {currentMember.role === 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => pinMessageMutation.mutate({
                              messageId: message.id,
                              isPinned: !message.is_pinned
                            })}
                            data-testid={`pin-message-${message.id}`}
                          >
                            <Pin className="w-3 h-3 mr-1" />
                            {message.is_pinned ? 'Unpin' : 'Pin'}
                          </Button>
                        )}
                        {(message.author_id === currentUser?.id || currentMember.role === 'owner') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive"
                            onClick={() => deleteMessageMutation.mutate(message.id)}
                            data-testid={`delete-message-${message.id}`}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-muted-foreground">
                {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          {!isConnected ? (
            <div className="text-center text-muted-foreground text-sm">
              {isConnecting ? 'Connecting to chat...' : 'Disconnected from chat'}
            </div>
          ) : !canSendMessage() ? (
            <div className="text-center text-muted-foreground text-sm">
              {communitySettings?.chatMode === 'owner_only' && 'Only the owner can send messages'}
              {communitySettings?.chatMode === 'moderators_only' && 'Only owners and moderators can send messages'}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={slowmodeTimer > 0 ? `Wait ${slowmodeTimer}s...` : "Type a message..."}
                  disabled={slowmodeTimer > 0 || sendMessageMutation.isPending}
                  className="flex-1"
                  data-testid="chat-message-input"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!messageInput.trim() || slowmodeTimer > 0 || sendMessageMutation.isPending}
                  size="icon"
                  data-testid="send-message-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
                {currentMember.role === 'owner' && (
                  <Button
                    onClick={() => handleSendMessage(true)}
                    disabled={!messageInput.trim() || slowmodeTimer > 0 || sendMessageMutation.isPending}
                    variant="secondary"
                    size="icon"
                    title="Send as announcement"
                    data-testid="send-announcement-button"
                  >
                    <Megaphone className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {slowmodeTimer > 0 && (
                <p className="text-xs text-muted-foreground">
                  Slowmode active: Wait {slowmodeTimer} seconds before sending another message
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Online Users Sidebar */}
      <div className="w-64 border-l bg-muted/10 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4" />
          <span className="font-medium">Online ({onlineUsers.length})</span>
        </div>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.userId} className="flex items-center gap-2" data-testid={`online-user-${user.userId}`}>
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                <span className="text-sm">{user.userName}</span>
                {renderRoleBadge(user.userRole)}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}