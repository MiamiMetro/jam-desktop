// useConversationScroll.ts — Extracted scroll management for DM conversations
import { useRef, useState, useEffect, useLayoutEffect } from "react";

interface UseConversationScrollOptions {
  messages: Array<{ id: string; [key: string]: any }>;
  conversationId: string;
  isLoadingOlderMessages: boolean;
}

export function useConversationScroll({
  messages,
  conversationId,
  isLoadingOlderMessages,
}: UseConversationScrollOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const justSentMessageRef = useRef(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newMessagesWhileScrolledUp, setNewMessagesWhileScrolledUp] = useState(0);
  const [scrollUpStartMessageId, setScrollUpStartMessageId] = useState<string | null>(null);

  // Preserve scroll position when loading older messages
  const scrollStateRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isLoadingOlderRef = useRef(false);
  const justLoadedOlderMessagesRef = useRef(false);

  useEffect(() => {
    if (isLoadingOlderMessages && !isLoadingOlderRef.current) {
      isLoadingOlderRef.current = true;
      const container = messagesContainerRef.current;
      if (container) {
        scrollStateRef.current = { scrollHeight: container.scrollHeight, scrollTop: container.scrollTop };
      }
    } else if (!isLoadingOlderMessages) {
      isLoadingOlderRef.current = false;
    }
  }, [isLoadingOlderMessages]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const messagesIncreased = messages.length > prevMessagesLengthRef.current;
    if (messagesIncreased && scrollStateRef.current && !isLoadingOlderMessages) {
      const { scrollHeight: oldScrollHeight, scrollTop: oldScrollTop } = scrollStateRef.current;
      container.scrollTop = oldScrollTop + (container.scrollHeight - oldScrollHeight);
      scrollStateRef.current = null;
      justLoadedOlderMessagesRef.current = true;
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isLoadingOlderMessages]);

  // Auto-scroll to bottom on new messages
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : null;

  useEffect(() => {
    if (justLoadedOlderMessagesRef.current) { justLoadedOlderMessagesRef.current = false; return; }
    const scrollToBottom = () => {
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    };
    if (justSentMessageRef.current) {
      justSentMessageRef.current = false;
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 100);
      return;
    }
    if (shouldAutoScrollRef.current) scrollToBottom();
  }, [lastMessageId]);

  // Reset on conversation change
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    if (messagesEndRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 100);
    }
  }, [conversationId]);

  // Scroll event listener — detect scrolled up state
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let currentScrollUpStartId = scrollUpStartMessageId;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
      const wasScrolledUp = !shouldAutoScrollRef.current;
      setIsScrolledUp(!isNearBottom);
      if (isNearBottom && wasScrolledUp) {
        setNewMessagesWhileScrolledUp(0);
        setScrollUpStartMessageId(null);
        currentScrollUpStartId = null;
      }
      if (!isNearBottom && !currentScrollUpStartId && messages.length > 0) {
        const newId = messages[messages.length - 1]?.id || null;
        setScrollUpStartMessageId(newId);
        currentScrollUpStartId = newId;
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages, scrollUpStartMessageId]);

  // Count new messages while scrolled up
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentLastId = messages.length > 0 ? messages[messages.length - 1]?.id : null;
    if (isScrolledUp && currentLastId && lastMessageIdRef.current && currentLastId !== lastMessageIdRef.current) {
      setNewMessagesWhileScrolledUp(prev => prev + 1);
    }
    lastMessageIdRef.current = currentLastId ?? null;
  }, [messages, isScrolledUp]);

  // Full reset on conversation change
  useEffect(() => {
    setIsScrolledUp(false);
    setNewMessagesWhileScrolledUp(0);
    setScrollUpStartMessageId(null);
    lastMessageIdRef.current = null;
    scrollStateRef.current = null;
    isLoadingOlderRef.current = false;
    justLoadedOlderMessagesRef.current = false;
    justSentMessageRef.current = false;
    prevMessagesLengthRef.current = 0;
    shouldAutoScrollRef.current = true;
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    shouldAutoScrollRef.current = true;
    setNewMessagesWhileScrolledUp(0);
    setScrollUpStartMessageId(null);
  };

  const markJustSentMessage = () => {
    shouldAutoScrollRef.current = true;
    justSentMessageRef.current = true;
    justLoadedOlderMessagesRef.current = false;
    setIsScrolledUp(false);
    setNewMessagesWhileScrolledUp(0);
    setScrollUpStartMessageId(null);
  };

  return {
    messagesEndRef,
    messagesContainerRef,
    isScrolledUp,
    newMessagesWhileScrolledUp,
    scrollUpStartMessageId,
    scrollToBottom,
    markJustSentMessage,
  };
}
