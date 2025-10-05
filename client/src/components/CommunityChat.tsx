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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
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

  // Load pinned messages (via REST API)
  const { data: pinnedMessages } = useQuery<{ messages: any[] }>({
    queryKey: ['/api/communities', communityId, 'chat/pinned'],
    enabled: !!currentMember && isConnected,
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest('DELETE', `/api/communities/${communityId}/chat/messages/${messageId}`);
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
      return apiRequest('POST', `/api/communities/${communityId}/chat/messages/${messageId}/pin`, { isPinned });
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
  const handleSendMessage = (isAnnouncement = false) => {
    if (!messageInput.trim() || slowmodeTimer > 0 || !canSendMessage()) return;
    
    // Send via WebSocket - server handles persistence and broadcasting
    const sent = wsSendMessage(messageInput, isAnnouncement);
    
    if (sent) {
      setMessageInput('');
      startSlowmodeTimer();
      
      // Reset typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTyping(false);
      }
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

  // Use messages from WebSocket hook (includes history)
  const allMessages = messages;

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

  const renderOnlineUsersList = () => (
    <div className="space-y-1">
      {onlineUsers.map((user) => (
        <div 
          key={user.userId} 
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-all duration-200 group" 
          data-testid={`online-user-${user.userId}`}
        >
          <div className="relative">
            <Avatar className="w-9 h-9 border-2 border-green-500/20">
              {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={user.userName} />}
              <AvatarFallback className="text-xs bg-gradient-to-br from-accent/20 to-accent/10">
                {user.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <Circle className="w-3 h-3 fill-green-500 text-green-500 absolute -bottom-0.5 -right-0.5 animate-pulse border-2 border-background rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block truncate">{user.userName}</span>
          </div>
          <div className="flex items-center">
            {renderRoleBadge(user.userRole)}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    <div className="flex h-[600px] border rounded-lg overflow-hidden relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Online Users Button - Only visible on mobile */}
        <div className="md:hidden bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b px-4 py-3 pb-safe">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOnlineUsersOpen(true)}
            className="w-full justify-between group hover:bg-accent/10 border-accent/20 transition-all duration-300 hover:shadow-md hover:shadow-accent/10"
            data-testid="mobile-online-users-button"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Users className="w-4 h-4 text-accent transition-transform group-hover:scale-110" />
                <Circle className="w-2 h-2 fill-green-500 text-green-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="font-medium text-sm">Online Members</span>
            </div>
            <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30 font-semibold">
              {onlineUsers.length}
            </Badge>
          </Button>
        </div>

        {/* Pinned Messages Banner */}
        {pinnedMessages && pinnedMessages.messages?.length > 0 && (
          <div className="bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800/30 p-3">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Pinned Messages</span>
            </div>
            <div className="mt-2 space-y-2">
              {pinnedMessages.messages.slice(0, 2).map((msg: any) => (
                <div key={`pinned-${msg.id}`} className="flex items-start justify-between gap-2 group">
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex-1 line-clamp-2">
                    {msg.content}
                  </p>
                  {currentMember.role === 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs opacity-60 hover:opacity-100 shrink-0"
                      onClick={() => pinMessageMutation.mutate({
                        messageId: msg.id,
                        isPinned: false
                      })}
                      data-testid={`unpin-banner-message-${msg.id}`}
                    >
                      <Pin className="w-3 h-3 mr-1" />
                      Unpin
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {!isConnected ? (
            <div className="text-center text-muted-foreground">Connecting to chat...</div>
          ) : allMessages.length === 0 ? (
            <div className="text-center text-muted-foreground">No messages yet. Start the conversation!</div>
          ) : (
            <div className="space-y-4">
              {allMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.is_announcement ? 'p-4 rounded-lg border-2 border-accent/30 bg-gradient-to-br from-accent/5 via-purple-500/5 to-pink-500/5 dark:from-accent/10 dark:via-purple-500/10 dark:to-pink-500/10 shadow-lg' : ''}`}
                  data-testid={`message-${message.id}`}
                >
                  {message.is_announcement && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 border border-accent/30">
                      <Megaphone className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  {!message.is_announcement && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.author.profile_image_url} />
                      <AvatarFallback>
                        {message.author.first_name[0]}{message.author.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${message.is_announcement ? 'text-accent' : ''}`}>
                        {message.author.first_name} {message.author.last_name}
                      </span>
                      {renderRoleBadge(
                        onlineUsers.find(u => u.userId === message.author_id)?.userRole || 'member'
                      )}
                      {message.is_announcement && (
                        <Badge className="text-xs bg-accent/20 text-accent border-accent/30">
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
                      <div className={`flex items-center gap-2 mt-2 transition-opacity ${message.is_pinned ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
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
        <div className="p-4 pb-safe border-t bg-background">
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
                  disabled={slowmodeTimer > 0 || !isConnected}
                  className="flex-1 h-11 text-base"
                  data-testid="chat-message-input"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!messageInput.trim() || slowmodeTimer > 0 || !isConnected}
                  size="icon"
                  className="h-11 w-11"
                  data-testid="send-message-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
                {currentMember.role === 'owner' && (
                  <Button
                    onClick={() => handleSendMessage(true)}
                    disabled={!messageInput.trim() || slowmodeTimer > 0 || !isConnected}
                    className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 h-11 w-11"
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

      {/* Online Users Sidebar - Desktop Only */}
      <div className="hidden md:flex md:w-64 border-l bg-muted/10 p-4 flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4" />
          <span className="font-medium">Online ({onlineUsers.length})</span>
        </div>
        <ScrollArea className="h-[500px]">
          {renderOnlineUsersList()}
        </ScrollArea>
      </div>
    </div>

    {/* Mobile Online Users Sheet */}
    <Sheet open={isOnlineUsersOpen} onOpenChange={setIsOnlineUsersOpen}>
      <SheetContent 
        side="right" 
        className="w-[85vw] sm:w-[400px] bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 border-l border-accent/20"
      >
        <SheetHeader className="border-b border-accent/10 pb-5 mb-5">
          <SheetTitle className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/10">
              <Users className="w-5 h-5 text-accent" />
              <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500 absolute -top-0.5 -right-0.5 animate-pulse border-2 border-background rounded-full" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Online Members
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {onlineUsers.length} {onlineUsers.length === 1 ? 'member' : 'members'} active now
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-160px)] pr-3 -mr-3">
          {onlineUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Users className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">No members online</p>
              <p className="text-xs mt-1 opacity-70">Check back later</p>
            </div>
          ) : (
            renderOnlineUsersList()
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  </>
  );
}