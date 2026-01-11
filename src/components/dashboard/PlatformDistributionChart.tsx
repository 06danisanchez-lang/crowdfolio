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

    return Object.entries(platformTotals)
      .filter(([_, value]) => value > 0)
      .map(([platform, value]) => ({
        name: PLATFORMS.find(p => p.value === platform)?.label || platform,
        value,
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
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
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
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
