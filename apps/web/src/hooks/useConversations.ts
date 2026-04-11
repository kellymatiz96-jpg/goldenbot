import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'bot' | 'agent';
  isRead: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  status: 'BOT_ACTIVE' | 'AGENT_ACTIVE' | 'CLOSED';
  lastMessageAt: string | null;
  lead: {
    id: string;
    name: string | null;
    phone: string | null;
    temperature: 'COLD' | 'WARM' | 'HOT';
    externalId: string | null;
  };
  channel: { type: string };
  assignedAgent: { id: string; name: string } | null;
  messages: Message[];
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[];
}

export function useConversations(clientId: string | null) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data.data.conversations);
    } catch {
      toast.error('Error al cargar las conversaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Conexión Socket.io para actualizaciones en tiempo real
  useEffect(() => {
    if (!clientId) return;

    const token = localStorage.getItem('goldenbot_token');
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:client', clientId);
    });

    // Nuevo mensaje llega: actualizar la lista
    socket.on('conversation:new_message', (data: { conversationId: string; message: Message }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, messages: [data.message], lastMessageAt: data.message.createdAt }
            : conv
        )
      );
    });

    // Nueva conversación creada
    socket.on('conversation:created', () => {
      fetchConversations();
    });

    // Estado de conversación cambió (bot ↔ agente)
    socket.on('conversation:status_changed', (data: { conversationId: string; status: string }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, status: data.status as ConversationSummary['status'] }
            : conv
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [clientId, fetchConversations]);

  const takeOver = async (conversationId: string) => {
    try {
      await api.post(`/conversations/${conversationId}/take-over`);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, status: 'AGENT_ACTIVE' as const } : c
        )
      );
    } catch {
      toast.error('Error al tomar el control');
    }
  };

  const release = async (conversationId: string) => {
    try {
      await api.post(`/conversations/${conversationId}/release`);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, status: 'BOT_ACTIVE' as const } : c
        )
      );
    } catch {
      toast.error('Error al devolver al bot');
    }
  };

  return { conversations, isLoading, takeOver, release, refetch: fetchConversations };
}

export function useConversationDetail(conversationId: string | null) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const fetch = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/conversations/${conversationId}`);
        setConversation(data.data);
      } catch {
        toast.error('Error al cargar la conversación');
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [conversationId]);

  // Escuchar mensajes nuevos en esta conversación específica
  useEffect(() => {
    if (!conversationId) return;

    const token = localStorage.getItem('goldenbot_token');
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:conversation', conversationId);
    });

    socket.on('message:new', (message: Message) => {
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, message] } : prev
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId]);

  const sendAgentMessage = async (content: string) => {
    if (!conversationId) return;
    try {
      const { data } = await api.post(`/conversations/${conversationId}/agent-message`, { content });
      // Agregar el mensaje al estado local inmediatamente
      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, data.data] } : prev
      );
    } catch {
      toast.error('Error al enviar el mensaje');
    }
  };

  return { conversation, isLoading, sendAgentMessage };
}
