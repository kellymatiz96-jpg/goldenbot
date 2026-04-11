'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useConversations, useConversationDetail } from '@/hooks/useConversations';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const temperatureConfig = {
  COLD: { label: 'Frío', variant: 'info' as const, emoji: '🔵' },
  WARM: { label: 'Tibio', variant: 'warning' as const, emoji: '🟠' },
  HOT: { label: 'Caliente', variant: 'danger' as const, emoji: '🔴' },
};

const channelEmoji: Record<string, string> = {
  WHATSAPP: '📱',
  INSTAGRAM: '📸',
  WEBCHAT: '🌐',
};

type FilterType = 'ALL' | 'HOT' | 'WARM' | 'COLD' | 'AGENT';

export default function ConversationsPage() {
  const { user } = useAuthStore();
  const { conversations, isLoading, takeOver, release } = useConversations(user?.clientId ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');

  const { conversation: detail, isLoading: detailLoading, sendAgentMessage } = useConversationDetail(selectedId);
  const [agentInput, setAgentInput] = useState('');

  const agentPendingCount = conversations.filter((c) => c.status === 'AGENT_ACTIVE').length;

  const filtered = conversations.filter((c) => {
    const matchSearch =
      !search ||
      c.lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.lead.phone?.includes(search) ||
      c.lead.externalId?.includes(search);
    if (filter === 'AGENT') return matchSearch && c.status === 'AGENT_ACTIVE';
    const matchTemp = filter === 'ALL' || c.lead.temperature === filter;
    return matchSearch && matchTemp;
  });

  const handleSend = async () => {
    if (!agentInput.trim()) return;
    await sendAgentMessage(agentInput.trim());
    setAgentInput('');
  };

  const handleSelectConv = (id: string) => {
    setSelectedId(id);
  };

  const handleBack = () => {
    setSelectedId(null);
  };

  // Panel izquierdo — lista
  const listPanel = (
    <div className={cn(
      'flex flex-col border-r border-dark-200 bg-white',
      // Móvil: pantalla completa si no hay conversación seleccionada
      // Desktop: panel fijo de 320px
      'w-full md:w-80 md:flex-shrink-0',
      selectedId ? 'hidden md:flex' : 'flex'
    )}>
      <div className="px-4 py-4 border-b border-dark-200">
        <h2 className="font-semibold text-dark-900 mb-3">Conversaciones</h2>
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input text-sm mb-2"
        />
        <button
          onClick={() => setFilter(filter === 'AGENT' ? 'ALL' : 'AGENT')}
          className={cn(
            'w-full text-xs py-1.5 rounded-md font-medium transition-colors mb-2 flex items-center justify-center gap-1.5',
            filter === 'AGENT'
              ? 'bg-orange-500 text-white'
              : agentPendingCount > 0
              ? 'bg-orange-100 text-orange-700 border border-orange-300 animate-pulse'
              : 'bg-dark-100 text-dark-500'
          )}
        >
          🎧 Esperando agente
          {agentPendingCount > 0 && (
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs font-bold',
              filter === 'AGENT' ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
            )}>
              {agentPendingCount}
            </span>
          )}
        </button>
        <div className="flex gap-1">
          {(['ALL', 'HOT', 'WARM', 'COLD'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'flex-1 text-xs py-1 rounded-md font-medium transition-colors',
                filter === t ? 'bg-primary-500 text-white' : 'bg-dark-100 text-dark-500 hover:bg-dark-200'
              )}
            >
              {t === 'ALL' ? 'Todos' : temperatureConfig[t].emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-dark-400 text-sm">
              {filter === 'AGENT' ? 'Nadie esperando agente' : 'No hay conversaciones'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const temp = temperatureConfig[conv.lead.temperature];
            const lastMsg = conv.messages[0];
            const isSelected = selectedId === conv.id;
            const needsAgent = conv.status === 'AGENT_ACTIVE';
            const timeAgo = conv.lastMessageAt
              ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true, locale: es })
              : '';

            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv.id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-dark-100 hover:bg-dark-50 transition-colors',
                  isSelected && 'bg-primary-50 border-l-2 border-l-primary-500',
                  needsAgent && !isSelected && 'border-l-2 border-l-orange-400 bg-orange-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{needsAgent ? '🎧' : temp.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-dark-900 text-sm truncate">
                        {conv.lead.name || conv.lead.phone || conv.lead.externalId || 'Desconocido'}
                      </p>
                      <p className="text-xs text-dark-400 truncate mt-0.5">
                        {lastMsg?.content || 'Sin mensajes'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-dark-300">{timeAgo}</span>
                    <span className="text-sm">{channelEmoji[conv.channel.type] || '💬'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 ml-7">
                  <Badge variant={temp.variant}>{temp.label}</Badge>
                  {needsAgent && <Badge variant="warning">🎧 Esperando</Badge>}
                  {conv.status === 'BOT_ACTIVE' && <Badge variant="default">Bot</Badge>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // Panel derecho — chat
  const chatPanel = (
    <div className={cn(
      'flex-1 flex flex-col bg-white',
      // Móvil: pantalla completa solo si hay conversación seleccionada
      // Desktop: siempre visible
      selectedId ? 'flex' : 'hidden md:flex'
    )}>
      {!selectedId ? (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            {agentPendingCount > 0 ? (
              <>
                <div className="text-5xl mb-3">🎧</div>
                <p className="text-orange-600 font-semibold">
                  {agentPendingCount} persona{agentPendingCount > 1 ? 's esperan' : ' espera'} un agente
                </p>
                <p className="text-dark-400 text-sm mt-1">Haz clic en una conversación para atenderla</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-3">👈</div>
                <p className="text-dark-500 font-medium">Selecciona una conversación</p>
                <p className="text-dark-400 text-sm mt-1">para ver el historial de mensajes</p>
              </>
            )}
          </div>
        </div>
      ) : detailLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : detail ? (
        <>
          {/* Header del chat */}
          <div className="px-3 py-2 border-b border-dark-200">
            {/* Fila 1: volver + nombre */}
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={handleBack}
                className="md:hidden text-sm text-dark-500 hover:text-dark-800 flex-shrink-0 font-medium"
              >
                ← Volver
              </button>
              <div className="w-8 h-8 rounded-full bg-dark-200 flex items-center justify-center text-sm flex-shrink-0">
                {detail.status === 'AGENT_ACTIVE' ? '🎧' : temperatureConfig[detail.lead.temperature].emoji}
              </div>
              <p className="font-semibold text-dark-900 text-sm truncate flex-1">
                {detail.lead.name || detail.lead.phone || detail.lead.externalId || 'Desconocido'}
              </p>
            </div>
            {/* Fila 2: badges + botón */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge variant={temperatureConfig[detail.lead.temperature].variant}>
                  {temperatureConfig[detail.lead.temperature].label}
                </Badge>
                <span className="text-xs text-dark-400">{channelEmoji[detail.channel.type]} {detail.channel.type}</span>
              </div>
              <div className="flex-shrink-0">
                {detail.status === 'BOT_ACTIVE' ? (
                  <Button size="sm" variant="primary" onClick={() => takeOver(detail.id)}>
                    🎧 Tomar control
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => release(detail.id)}>
                    🤖 Devolver bot
                  </Button>
                )}
              </div>
            </div>
          </div>

          {detail.status === 'AGENT_ACTIVE' && (
            <div className="px-4 py-2 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
              <span className="text-orange-500 text-sm">🎧</span>
              <p className="text-xs text-orange-700 font-medium">
                Esta persona solicitó hablar con un agente — haz clic en "Tomar control" para responder
              </p>
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {detail.messages.length === 0 ? (
              <p className="text-center text-dark-400 text-sm py-8">No hay mensajes en esta conversación</p>
            ) : (
              detail.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
          </div>

          {/* Caja de respuesta */}
          {detail.status === 'AGENT_ACTIVE' && (
            <div className="px-4 py-3 border-t border-dark-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Escribe tu respuesta aquí..."
                  className="input flex-1 text-sm"
                />
                <Button onClick={handleSend} disabled={!agentInput.trim()}>
                  Enviar
                </Button>
              </div>
              <p className="text-xs text-dark-400 mt-1">Estás respondiendo como agente humano.</p>
            </div>
          )}

          {detail.status === 'BOT_ACTIVE' && (
            <div className="px-4 py-3 border-t border-dark-200 bg-dark-50">
              <p className="text-xs text-dark-400 text-center">
                🤖 El bot está gestionando esta conversación. Haz clic en "Tomar control" para responder tú.
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)] -m-4 md:-m-8 overflow-hidden rounded-none md:rounded-xl border-0 md:border border-dark-200">
      {listPanel}
      {chatPanel}
    </div>
  );
}

function MessageBubble({ message }: { message: { content: string; role: string; createdAt: string } }) {
  const isUser = message.role === 'user';
  const isBot = message.role === 'bot';
  const isAgent = message.role === 'agent';

  return (
    <div className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
      <div className={cn(
        'max-w-[80%] md:max-w-[70%] px-3 py-2 rounded-2xl text-sm',
        isUser && 'bg-dark-100 text-dark-900 rounded-tl-sm',
        isBot && 'bg-primary-500 text-white rounded-tr-sm',
        isAgent && 'bg-green-500 text-white rounded-tr-sm'
      )}>
        {(isBot || isAgent) && (
          <p className="text-xs opacity-75 mb-1">{isBot ? '🤖 Bot' : '👤 Agente'}</p>
        )}
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className={cn('text-xs mt-1 opacity-60', isUser ? 'text-right' : 'text-left')}>
          {new Date(message.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
