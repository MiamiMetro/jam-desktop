// DMConversation.tsx — Full DM conversation with fixed bottom input, proper scroll containment
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoLinkedText } from "@/components/AutoLinkedText";
import { ArrowLeft, Send, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAllUsers, useMessages, useSendMessage, useMarkAsRead, useConversations } from "@/hooks/useUsers";
import { useConversationScroll } from "@/hooks/useConversationScroll";

type MessageWithTime = {
  id: string;
  senderId?: string;
  _creationTime?: number;
};

function shouldShowUnreadDivider(
  message: MessageWithTime,
  index: number,
  messages: MessageWithTime[],
  isOwn: boolean,
  lastReadMessageAt: number | null,
  conversationOpenedAt: number | null,
  scrollUpStartMessageId: string | null
): boolean {
  const messageTime = message._creationTime;
  const isHistoricalUnread =
    !isOwn && lastReadMessageAt != null && messageTime != null &&
    messageTime > lastReadMessageAt &&
    (conversationOpenedAt == null || messageTime < conversationOpenedAt);
  const isFirstAfterScrollUp =
    !isOwn && scrollUpStartMessageId != null && index > 0 &&
    messages[index - 1]?.id === scrollUpStartMessageId;
  const isFirstHistoricalUnread =
    isHistoricalUnread &&
    (index === 0 || (messages[index - 1]._creationTime ?? 0) <= (lastReadMessageAt ?? 0));
  return isFirstHistoricalUnread || isFirstAfterScrollUp;
}

function formatTime(date: Date | string) {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return "now";
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface DMConversationProps {
  partnerId: string;
  onBack: () => void;
}

export default function DMConversation({ partnerId, onBack }: DMConversationProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [messageInput, setMessageInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const MAX_MESSAGE_LENGTH = 500;

  const { data: allUsers = [] } = useAllUsers(undefined, !!partnerId);
  const { data: conversations = [] } = useConversations(user?.id || "");
  const {
    data: messages = [],
    fetchNextPage: loadOlderMessages,
    hasNextPage: hasOlderMessages,
    isFetchingNextPage: isLoadingOlderMessages,
    lastReadMessageAt,
    conversationOpenedAt,
    otherParticipantLastRead,
  } = useMessages(user?.id || "", partnerId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  const chatPartner = allUsers.find((u: { id: string }) => u.id === partnerId);

  const {
    messagesEndRef,
    messagesContainerRef,
    isScrolledUp,
    newMessagesWhileScrolledUp,
    scrollUpStartMessageId,
    scrollToBottom,
    markJustSentMessage,
  } = useConversationScroll({
    messages,
    partnerId,
    isLoadingOlderMessages,
  });

  // Mark as read logic
  const canMarkOnLeaveRef = useRef(false);
  const currentPartnerRef = useRef<string | null>(null);
  const hasMarkedCurrentUnreadRef = useRef(false);
  const prevHasUnreadRef = useRef(false);
  const currentConversation = conversations.find((c) => String(c.userId) === String(partnerId));
  const hasUnread = currentConversation?.hasUnread ?? false;

  useEffect(() => {
    if (hasUnread && !prevHasUnreadRef.current) hasMarkedCurrentUnreadRef.current = false;
    prevHasUnreadRef.current = hasUnread;
  }, [hasUnread]);

  useEffect(() => {
    if (!partnerId) { canMarkOnLeaveRef.current = false; return; }
    currentPartnerRef.current = partnerId;
    if (!hasUnread || hasMarkedCurrentUnreadRef.current) return;
    const enableLeaveTimer = setTimeout(() => { canMarkOnLeaveRef.current = true; }, 500);
    const timer = setTimeout(() => {
      markAsReadMutation.mutate(partnerId);
      hasMarkedCurrentUnreadRef.current = true;
      canMarkOnLeaveRef.current = false;
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearTimeout(enableLeaveTimer);
      if (canMarkOnLeaveRef.current && currentPartnerRef.current && !hasMarkedCurrentUnreadRef.current) {
        markAsReadMutation.mutate(currentPartnerRef.current);
        hasMarkedCurrentUnreadRef.current = true;
      }
      canMarkOnLeaveRef.current = false;
    };
  }, [partnerId, hasUnread, markAsReadMutation]);

  useEffect(() => {
    hasMarkedCurrentUnreadRef.current = false;
    prevHasUnreadRef.current = false;
    canMarkOnLeaveRef.current = false;
  }, [partnerId]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !user) return;
    markJustSentMessage();
    setSendError(null);
    sendMessageMutation.mutate(
      { senderId: user.id, receiverId: partnerId, content: messageInput.trim() },
      {
        onError: (error) => {
          const msg = error.message || "Failed to send message";
          setSendError(msg.includes("Rate limit") ? "Slow down! Please wait a moment." : msg);
          setTimeout(() => setSendError(null), 5000);
        },
      }
    );
    setMessageInput("");
  };

  const charCount = messageInput.length;
  const showCharCount = charCount > MAX_MESSAGE_LENGTH * 0.8;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Conversation Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 glass-strong">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {chatPartner && (
          <button
            onClick={() => navigate(`/profile/${chatPartner.username}`)}
            className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Avatar size="default" className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={chatPartner.avatar_url || ""} alt={chatPartner.username} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                {chatPartner.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{chatPartner.username}</div>
            </div>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 relative">
        <div className="px-4 py-3 space-y-1">
          {hasOlderMessages && (
            <div className="py-2 text-center">
              <Button
                variant="ghost" size="sm"
                onClick={() => loadOlderMessages()}
                disabled={isLoadingOlderMessages}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {isLoadingOlderMessages ? "Loading..." : "Load older messages"}
              </Button>
            </div>
          )}
          {messages.map((message: any, index: number) => {
            const isOwn = message.senderId === user?.id;
            const isFirstUnread = shouldShowUnreadDivider(
              message, index, messages, isOwn,
              lastReadMessageAt, conversationOpenedAt, scrollUpStartMessageId
            );
            return (
              <div key={message.id}>
                {isFirstUnread && (
                  <div className="flex items-center gap-2 py-3">
                    <div className="flex-1 h-px bg-primary/30" />
                    <span className="text-[10px] text-primary font-medium px-2">New Messages</span>
                    <div className="flex-1 h-px bg-primary/30" />
                  </div>
                )}
                <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md shadow-sm"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    <AutoLinkedText
                      text={message.content || ''}
                      className="wrap-break-word whitespace-pre-wrap leading-relaxed"
                      linkClassName={isOwn ? "underline text-primary-foreground hover:opacity-80" : "underline text-primary hover:opacity-80"}
                    />
                    <div className={`text-[10px] mt-1 flex items-center gap-1 ${
                      isOwn ? "text-primary-foreground/60 justify-end" : "text-muted-foreground"
                    }`}>
                      <span>{message.timestamp ? formatTime(message.timestamp) : 'now'}</span>
                      {isOwn && (
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            message._creationTime && otherParticipantLastRead && message._creationTime <= otherParticipantLastRead
                              ? "bg-emerald-400"
                              : "bg-primary-foreground/30"
                          }`}
                          title={
                            message._creationTime && otherParticipantLastRead && message._creationTime <= otherParticipantLastRead
                              ? "Read" : "Delivered"
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {isScrolledUp && (
          <div className="sticky bottom-3 flex justify-end pr-4 pointer-events-none">
            <Button
              variant="secondary" size="icon"
              className="h-9 w-9 rounded-full shadow-lg relative pointer-events-auto border border-border"
              onClick={scrollToBottom}
            >
              <ChevronDown className="h-4 w-4" />
              {newMessagesWhileScrolledUp > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {newMessagesWhileScrolledUp > 99 ? "99+" : newMessagesWhileScrolledUp}
                </span>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {sendError && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex-shrink-0">
          <p className="text-xs text-destructive flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            {sendError}
          </p>
        </div>
      )}

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0 bg-background">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Start a new message"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="w-full h-10 text-sm bg-muted/50 border-transparent focus:bg-background focus:border-border rounded-full px-4 pr-12"
              maxLength={MAX_MESSAGE_LENGTH}
              autoFocus
            />
            {showCharCount && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${
                charCount >= MAX_MESSAGE_LENGTH ? "text-destructive" : "text-muted-foreground"
              }`}>
                {charCount}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0"
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
