'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import PushNotificationProvider from '@/components/PushNotificationProvider';
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
  onClick?: () => void;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loadFromStorage, logout } = useAuthStore();
  const [pendingAgentCount, setPendingAgentCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Cerrar sidebar al cambiar de página en móvil
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-lg">
            🤖
          </div>
          <div>
            <p className="font-bold text-base text-white">GoldenBot</p>
            <p className="text-xs text-dark-400 truncate max-w-[120px]">{user.name}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="text-xs text-dark-500 font-semibold uppercase tracking-wider px-3 mb-2">
          Principal
        </p>
        <NavItem href="/dashboard" icon="📊" label="Dashboard" currentPath={pathname} onClick={() => setSidebarOpen(false)} />
        <NavItem href="/dashboard/leads" icon="🎯" label="Leads" currentPath={pathname} onClick={() => setSidebarOpen(false)} />
        <NavItem href="/dashboard/remarketing" icon="📢" label="Remarketing" currentPath={pathname} onClick={() => setSidebarOpen(false)} />
        <NavItem
          href="/dashboard/conversations"
          icon="💬"
          label="Conversaciones"
          currentPath={pathname}
          badge={pendingAgentCount}
          onClick={() => setSidebarOpen(false)}
        />
        <p className="text-xs text-dark-500 font-semibold uppercase tracking-wider px-3 mb-2 mt-5">
          Configuración
        </p>
        <NavItem href="/dashboard/settings/business" icon="🏢" label="Mi negocio" currentPath={pathname} onClick={() => setSidebarOpen(false)} />
        <NavItem href="/dashboard/settings/agents" icon="👤" label="Agentes" currentPath={pathname} onClick={() => setSidebarOpen(false)} />
        <NavItem href="/dashboard/settings/webchat" icon="🌐" label="Widget web" currentPath={pathname} onClick={() => setSidebarOpen(false)} />
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
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-dark-50">
      <ImpersonationBanner />
      <PushNotificationProvider />

      {/* Topbar móvil */}
      <header className="md:hidden bg-dark-900 text-white flex items-center justify-between px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center text-sm">🤖</div>
          <span className="font-bold text-sm">GoldenBot</span>
        </div>
        <div className="flex items-center gap-3">
          {pendingAgentCount > 0 && (
            <Link href="/dashboard/conversations" className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 animate-pulse">
              🔔 {pendingAgentCount > 9 ? '9+' : pendingAgentCount}
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors"
            aria-label="Menú"
          >
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Overlay móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar desktop (siempre visible) */}
        <aside className="hidden md:flex w-64 bg-dark-900 text-white flex-col fixed h-full z-10">
          {sidebarContent}
        </aside>

        {/* Sidebar móvil (drawer) */}
        <aside
          className={cn(
            'fixed top-0 left-0 h-full w-72 bg-dark-900 text-white flex flex-col z-30 transition-transform duration-300 md:hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, currentPath, badge, onClick }: NavItemProps) {
  const isActive =
    href === '/dashboard'
      ? currentPath === '/dashboard'
      : currentPath.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
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
