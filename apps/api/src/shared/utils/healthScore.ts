interface HealthScoreInput {
  hotLeads: number;
  warmLeads: number;
  totalLeads: number;
  conversationsToday: number;
}

// Score de salud (0-100) — algoritmo simple basado en métricas
export function calculateHealthScore({
  hotLeads,
  warmLeads,
  totalLeads,
  conversationsToday,
}: HealthScoreInput): number {
  const hotRatio = totalLeads > 0 ? hotLeads / totalLeads : 0;
  const warmRatio = totalLeads > 0 ? warmLeads / totalLeads : 0;
  const activityScore = Math.min(conversationsToday * 5, 30);
  const conversionScore = Math.round(hotRatio * 40 + warmRatio * 20 + activityScore);
  return Math.min(Math.max(conversionScore, 0), 100);
}
