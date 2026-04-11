'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  currentPath: string;
  badge?: number;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loadFromStorage, logout } = useAuthStore();
  const [pendingAgentCount, setPendingAgentCount] = useState(0);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Cargar conversaciones pendientes de agente al entrar
  const loadPendingCount = useCallback(async () => {
    if (!user?.clientId) return;
    try {
      const { data } = await api.get('/conversations?page=1&limit=100');
      const conversations = data.data?.conversations || [];
      const pending = conversations.filter((c: { status: string }) => c.status === 'AGENT_ACTIVE').length;
      setPendingAgentCount(pending);
    } catch {
      // silencioso
    }
  }, [user?.clientId]);

  useEffect(() => {
    if (!user?.clientId) return;
    loadPendingCount();

    // Escuchar eventos en tiempo real
    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    socket.emit('join:client', user.clientId);

    socket.on('alert:new', (data: { type: string; message: string }) => {
      if (data.type === 'HUMAN_REQUESTED') {
        setPendingAgentCount((prev) => prev + 1);
        toast('🔔 ¡Atención requerida! Un lead solicita hablar con un agente.', {
          duration: 8000,
          style: { background: '#f97316', color: '#fff' },
        });
      }

      if (data.type === 'HOT_LEAD') {
        toast('🔥 ¡Lead caliente detectado! Un prospecto está listo para comprar.', {
          duration: 8000,
          style: { background: '#ef4444', color: '#fff' },
        });
      }
    });

    socket.on('conversation:status_changed', (data: { status: string }) => {
      if (data.status === 'BOT_ACTIVE') {
        // Un agente devolvió al bot, recargar conteo
        loadPendingCount();
      }
    });

    return () => { socket.disconnect(); };
  }, [user?.clientId, loadPendingCount]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-dark-50">
      <ImpersonationBanner />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-dark-900 text-white flex flex-col fixed h-full z-10">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-lg">
                🤖
              </div>
              <div>
                <p className="font-bold text-base text-white">GoldenBot</p>
                <p className="text-xs text-dark-400 truncate max-w-[120px]">
                  {user.name}
                </p>
              </div>
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            <p className="text-xs text-dark-500 font-semibold uppercase tracking-wider px-3 mb-2">
              Principal
            </p>
            <NavItem href="/dashboard" icon="📊" label="Dashboard" currentPath={pathname} />
            <NavItem href="/dashboard/leads" icon="🎯" label="Leads" currentPath={pathname} />
            <NavItem href="/dashboard/remarketing" icon="📢" label="Remarketing" currentPath={pathname} />
            <NavItem
              href="/dashboard/conversations"
              icon="💬"
              label="Conversaciones"
              currentPath={pathname}
              badge={pendingAgentCount}
            />

            <p className="text-xs text-dark-500 font-semibold uppercase tracking-wider px-3 mb-2 mt-5">
              Configuración
            </p>
            <NavItem href="/dashboard/settings/business" icon="🏢" label="Mi negocio" currentPath={pathname} />
            <NavItem href="/dashboard/settings/agents" icon="👤" label="Agentes" currentPath={pathname} />
            <NavItem href="/dashboard/settings/webchat" icon="🌐" label="Widget web" currentPath={pathname} />
          </nav>

          {/* Footer — perfil */}
          <div className="px-3 py-4 border-t border-dark-700">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-dark-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 ml-64 p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, currentPath, badge }: NavItemProps) {
  const isActive =
    href === '/dashboard'
      ? currentPath === '/dashboard'
      : currentPath.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-500 text-white'
          : 'text-dark-300 hover:text-white hover:bg-dark-700'
      )}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );
}
