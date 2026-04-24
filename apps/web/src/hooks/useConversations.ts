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
    appointmentBooked: boolean;
  };
  channel: { type: string };
  assignedAgent: { id: string; name: string } | null;
  messages: Message[];
}

export interface ConversationDetail extends ConversationSummary {
  messages: Message[];
  lead: ConversationSummary['lead'] & { appointmentBooked: boolean };
  client?: { businessInfo: { conversionGoal: string | null } | null };
}

export function useConversations(clientId: string | null) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data.data?.conversations ?? []);
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
    // El backend envía: { conversationId, role, content, createdAt }
    socket.on('conversation:new_message', (data: {
      conversationId: string;
      role?: string;
      content?: string;
      createdAt?: string;
      message?: Message;
    }) => {
      // Soportar tanto el formato plano como el anidado
      const msg: Message | null = data.message ?? (data.content ? {
        id: Date.now().toString(),
        content: data.content,
        role: (data.role ?? 'bot') as Message['role'],
        isRead: false,
        createdAt: data.createdAt ?? new Date().toISOString(),
      } : null);

      if (!msg) return;

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, messages: [msg], lastMessageAt: msg.createdAt }
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

  const fetchDetail = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(`/conversations/${conversationId}`);
      setConversation(data.data);
    } catch {
      toast.error('Error al cargar la conversación');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Escuchar mensajes nuevos y cambios de estado en esta conversación
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
      setConversation((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === message.id)) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
    });

    // Actualizar el estado del detalle cuando cambia (takeover / release)
    socket.on('conversation:status_changed', (data: { conversationId: string; status: string }) => {
      if (data.conversationId === conversationId) {
        setConversation((prev) =>
          prev ? { ...prev, status: data.status as ConversationDetail['status'] } : prev
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId]);

  const sendAgentMessage = async (content: string) => {
    if (!conversationId) return;
    try {
      const { data } = await api.post(`/conversations/${conversationId}/agent-message`, { content });
      // Dedup: el socket puede llegar antes que el response HTTP
      setConversation((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === data.data.id)) return prev;
        return { ...prev, messages: [...prev.messages, data.data] };
      });
    } catch {
      toast.error('Error al enviar el mensaje');
    }
  };

  const toggleAppointmentBooked = async () => {
    if (!conversationId || !conversation) return;
    const newValue = !conversation.lead.appointmentBooked;
    try {
      await api.put(`/conversations/${conversationId}/appointment-booked`, { booked: newValue });
      setConversation((prev) =>
        prev ? { ...prev, lead: { ...prev.lead, appointmentBooked: newValue } } : prev
      );
      toast.success(newValue ? '📅 Lead marcado como agendado' : 'Marca de agendado removida');
    } catch {
      toast.error('Error al actualizar el estado');
    }
  };

  return { conversation, isLoading, sendAgentMessage, toggleAppointmentBooked, refetch: fetchDetail };
}
