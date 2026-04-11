'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

interface DashboardMetrics {
  conversationsToday: number;
  activeConversations: number;
  leads: { cold: number; warm: number; hot: number; total: number };
  chartData: Array<{ date: string; conversaciones: number }>;
  healthScore: number;
  comparison: { leadsThisMonth: number; leadsLastMonth: number; change: number };
}

const PIE_COLORS = { cold: '#93c5fd', warm: '#fdba74', hot: '#f87171' };

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

  const pieData = metrics
    ? [
        { name: 'Frío', value: metrics.leads.cold, color: PIE_COLORS.cold },
        { name: 'Tibio', value: metrics.leads.warm, color: PIE_COLORS.warm },
        { name: 'Caliente', value: metrics.leads.hot, color: PIE_COLORS.hot },
      ].filter((d) => d.value > 0)
    : [];

  const healthColor =
    (metrics?.healthScore ?? 0) >= 70
      ? 'text-green-600'
      : (metrics?.healthScore ?? 0) >= 40
      ? 'text-orange-500'
      : 'text-red-500';

  const changeSign = (metrics?.comparison.change ?? 0) >= 0 ? '+' : '';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">
          Bienvenido, {user?.name} 👋
        </h1>
        <p className="text-dark-500 mt-1">Aquí está el resumen de tu negocio hoy</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Conversaciones hoy"
          value={metrics?.conversationsToday ?? 0}
          icon="💬"
          hint="Nuevas conversaciones iniciadas hoy"
        />
        <KPICard
          title="Activas ahora"
          value={metrics?.activeConversations ?? 0}
          icon="🟢"
          hint="Conversaciones sin cerrar"
        />
        <KPICard
          title="Total de leads"
          value={metrics?.leads.total ?? 0}
          icon="🎯"
          hint={`${changeSign}${metrics?.comparison.change ?? 0}% vs mes anterior`}
          hintColor={(metrics?.comparison.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}
        />
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-2xl">
            ❤️
          </div>
          <div>
            <p className="text-sm text-dark-500">Score de salud</p>
            <p className={`text-2xl font-bold ${healthColor}`}>
              {metrics?.healthScore ?? 0}
              <span className="text-base font-normal text-dark-400">/100</span>
            </p>
          </div>
        </div>
      </div>

      {/* Leads por temperatura */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <TemperatureCard
          label="Leads fríos"
          value={metrics?.leads.cold ?? 0}
          emoji="🔵"
          className="border-l-4 border-blue-300"
          description="Explorando, sin intención clara"
        />
        <TemperatureCard
          label="Leads tibios"
          value={metrics?.leads.warm ?? 0}
          emoji="🟠"
          className="border-l-4 border-orange-300"
          description="Interesados, necesitan más info"
        />
        <TemperatureCard
          label="Leads calientes"
          value={metrics?.leads.hot ?? 0}
          emoji="🔴"
          className="border-l-4 border-red-400"
          description="Listos para comprar — ¡atender ya!"
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gráfica de barras — conversaciones últimos 7 días */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-dark-900 mb-4">Conversaciones — últimos 7 días</h2>
          {metrics && metrics.chartData.some((d) => d.conversaciones > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="conversaciones" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-dark-400 text-sm">
              No hay conversaciones en los últimos 7 días
            </div>
          )}
        </div>

        {/* Gráfica de pastel — distribución de temperatura */}
        <div className="card">
          <h2 className="font-semibold text-dark-900 mb-4">Temperatura de leads</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} leads`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-dark-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-dark-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-dark-400 text-sm">
              Sin leads registrados aún
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="card">
        <h2 className="font-semibold text-dark-900 mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink href="/dashboard/conversations" icon="💬" label="Ver conversaciones" />
          <QuickLink href="/dashboard/settings/business" icon="🏢" label="Configurar mi negocio" />
          <QuickLink href="/dashboard/settings/agents" icon="👤" label="Gestionar agentes" />
          <QuickLink href="/dashboard/conversations" icon="🔴" label={`${metrics?.leads.hot ?? 0} leads calientes`} />
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  hint,
  hintColor = 'text-dark-400',
}: {
  title: string;
  value: number;
  icon: string;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-dark-100 flex items-center justify-center text-2xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm text-dark-500">{title}</p>
        <p className="text-2xl font-bold text-dark-900">{value.toLocaleString('es-ES')}</p>
        {hint && <p className={`text-xs mt-0.5 ${hintColor}`}>{hint}</p>}
      </div>
    </div>
  );
}

function TemperatureCard({
  label,
  value,
  emoji,
  description,
  className,
}: {
  label: string;
  value: number;
  emoji: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-dark-700">{label}</span>
        <span className="text-xl">{emoji}</span>
      </div>
      <p className="text-3xl font-bold text-dark-900">{value}</p>
      <p className="text-xs text-dark-400 mt-1">{description}</p>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-dark-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-dark-700">{label}</span>
    </Link>
  );
}
