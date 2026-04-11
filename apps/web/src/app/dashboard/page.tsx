'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface DashboardMetrics {
  conversationsToday: number;
  activeConversations: number;
  leads: { cold: number; warm: number; hot: number; total: number };
  chartData: Array<{ date: string; conversaciones: number }>;
  healthScore: number;
  comparison: { leadsThisMonth: number; leadsLastMonth: number; change: number };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/conversations/dashboard');
        setMetrics(data.data);
      } catch {
        toast.error('Error al cargar las métricas');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const healthColor =
    (metrics?.healthScore ?? 0) >= 70 ? 'text-green-600'
    : (metrics?.healthScore ?? 0) >= 40 ? 'text-orange-500'
    : 'text-red-500';

  const changeSign = (metrics?.comparison.change ?? 0) >= 0 ? '+' : '';

  return (
    <div className="space-y-4 md:space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-dark-900">
          Bienvenido, {user?.name} 👋
        </h1>
        <p className="text-dark-500 text-sm mt-1">Aquí está el resumen de tu negocio hoy</p>
      </div>

      {/* KPIs principales — 2 columnas en móvil, 4 en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Conversaciones hoy"
          value={metrics?.conversationsToday ?? 0}
          icon="💬"
          hint="Nuevas hoy"
        />
        <KPICard
          title="Activas ahora"
          value={metrics?.activeConversations ?? 0}
          icon="🟢"
          hint="Sin cerrar"
        />
        <KPICard
          title="Total leads"
          value={metrics?.leads.total ?? 0}
          icon="🎯"
          hint={`${changeSign}${metrics?.comparison.change ?? 0}% vs mes anterior`}
          hintColor={(metrics?.comparison.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}
        />
        <div className="card flex items-center gap-3 p-3 md:p-5">
          <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
            ❤️
          </div>
          <div className="min-w-0">
            <p className="text-xs text-dark-500 truncate">Score de salud</p>
            <p className={`text-xl md:text-2xl font-bold ${healthColor}`}>
              {metrics?.healthScore ?? 0}
              <span className="text-sm font-normal text-dark-400">/100</span>
            </p>
          </div>
        </div>
      </div>

      {/* Leads por temperatura — 3 columnas compactas */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <TemperatureCard label="Fríos" value={metrics?.leads.cold ?? 0} emoji="🔵" className="border-l-4 border-blue-300" />
        <TemperatureCard label="Tibios" value={metrics?.leads.warm ?? 0} emoji="🟠" className="border-l-4 border-orange-300" />
        <TemperatureCard label="Calientes" value={metrics?.leads.hot ?? 0} emoji="🔴" className="border-l-4 border-red-400" />
      </div>

      {/* Gráfica conversaciones */}
      <div className="card">
        <h2 className="font-semibold text-dark-900 mb-4 text-sm md:text-base">
          Conversaciones — últimos 7 días
        </h2>
        {metrics && metrics.chartData.some((d) => d.conversaciones > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={metrics.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="conversaciones" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-dark-400 text-sm">
            No hay conversaciones en los últimos 7 días
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <div className="card">
        <h2 className="font-semibold text-dark-900 mb-3 text-sm md:text-base">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <QuickLink href="/dashboard/conversations" icon="💬" label="Conversaciones" />
          <QuickLink href="/dashboard/settings/business" icon="🏢" label="Mi negocio" />
          <QuickLink href="/dashboard/settings/agents" icon="👤" label="Agentes" />
          <QuickLink href="/dashboard/leads" icon="🎯" label={`${metrics?.leads.hot ?? 0} leads calientes`} />
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title, value, icon, hint, hintColor = 'text-dark-400',
}: {
  title: string; value: number; icon: string; hint?: string; hintColor?: string;
}) {
  return (
    <div className="card flex items-center gap-2 md:gap-4 p-3 md:p-5">
      <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-dark-100 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-dark-500 leading-tight truncate">{title}</p>
        <p className="text-xl md:text-2xl font-bold text-dark-900">{value.toLocaleString('es-ES')}</p>
        {hint && <p className={`text-xs mt-0.5 truncate ${hintColor}`}>{hint}</p>}
      </div>
    </div>
  );
}

function TemperatureCard({
  label, value, emoji, className,
}: {
  label: string; value: number; emoji: string; className?: string;
}) {
  return (
    <div className={`card p-3 md:p-5 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs md:text-sm font-medium text-dark-700">{label}</span>
        <span className="text-base md:text-xl">{emoji}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-dark-900">{value}</p>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-3 rounded-lg border border-dark-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <span className="text-xs md:text-sm font-medium text-dark-700 truncate">{label}</span>
    </Link>
  );
}
