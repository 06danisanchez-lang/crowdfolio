import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Investment, PLATFORMS, Platform } from '@/types/investment';

interface PlatformDistributionChartProps {
  investments: Investment[];
}

const PLATFORM_COLORS: Record<Platform, string> = {
  urbanitae: 'hsl(210, 100%, 45%)',
  housers: 'hsl(25, 95%, 53%)',
  estateguru: 'hsl(142, 76%, 36%)',
  crowdcube: 'hsl(262, 83%, 58%)',
  brickstarter: 'hsl(340, 82%, 52%)',
  wecity: 'hsl(199, 89%, 48%)',
  other: 'hsl(220, 9%, 46%)',
};

export function PlatformDistributionChart({ investments }: PlatformDistributionChartProps) {
  const data = useMemo(() => {
    const platformTotals = investments.reduce((acc, inv) => {
      acc[inv.platform] = (acc[inv.platform] || 0) + inv.amount;
      return acc;
    }, {} as Record<Platform, number>);

    const total = Object.values(platformTotals).reduce((s, v) => s + (v > 0 ? v : 0), 0);
    return Object.entries(platformTotals)
      .filter(([_, value]) => value > 0)
      .map(([platform, value]) => ({
        name: PLATFORMS.find(p => p.value === platform)?.label || platform,
        value,
        share: total > 0 ? value / total : 0,
        platform: platform as Platform,
      }))
      .sort((a, b) => b.value - a.value);
  }, [investments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (share: number) =>
    new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 0 }).format(share);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell 
              key={entry.platform} 
              fill={PLATFORM_COLORS[entry.platform]}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
        />
        {/* El % va en la leyenda: las etiquetas alrededor del anillo se cortaban en
            pantallas estrechas y repetían lo que ya decía la leyenda. */}
        <Legend
          formatter={(value: string, entry) => {
            const share = (entry.payload as { share?: number } | undefined)?.share ?? 0;
            return (
              <span className="text-foreground">
                {value} · {formatPercent(share)}
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
