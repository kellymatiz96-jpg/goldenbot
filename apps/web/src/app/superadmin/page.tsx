'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface GlobalMetrics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalLeads: number;
  totalConversations: number;
  clientsByPlan: Array<{ plan: string; count: number }>;
}

export default function SuperadminDashboard() {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await api.get('/admin/clients/metrics');
        setMetrics(data.data);
      } catch {
        toast.error('Error al cargar las métricas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planLabel: Record<string, string> = {
    BASIC: 'Básico',
    PROFESSIONAL: 'Profesional',
    PREMIUM: 'Premium',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900">Panel de Administración</h1>
        <p className="text-dark-500 mt-1">Vista global de toda la plataforma GoldenBot</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Clientes totales"
          value={metrics?.totalClients ?? 0}
          icon="👥"
          color="bg-blue-50 text-blue-600"
        />
        <KPICard
          title="Clientes activos"
          value={metrics?.activeClients ?? 0}
          icon="✅"
          color="bg-green-50 text-green-600"
        />
        <KPICard
          title="Total de leads"
          value={metrics?.totalLeads ?? 0}
          icon="🎯"
          color="bg-primary-50 text-primary-600"
        />
        <KPICard
          title="Conversaciones"
          value={metrics?.totalConversations ?? 0}
          icon="💬"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Distribución por plan */}
      <div className="card">
        <h2 className="text-lg font-semibold text-dark-900 mb-4">Clientes por plan</h2>
        {metrics?.clientsByPlan && metrics.clientsByPlan.length > 0 ? (
          <div className="space-y-3">
            {metrics.clientsByPlan.map((item) => (
              <div key={item.plan} className="flex items-center justify-between">
                <span className="text-sm text-dark-600">{planLabel[item.plan] || item.plan}</span>
                <span className="font-semibold text-dark-900">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-400 text-sm">No hay clientes registrados aún.</p>
        )}
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-dark-500">{title}</p>
        <p className="text-2xl font-bold text-dark-900">{value.toLocaleString('es-ES')}</p>
      </div>
    </div>
  );
}
