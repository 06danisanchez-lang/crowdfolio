import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Investment, PLATFORMS, Platform } from '@/types/investment';

interface ReturnComparisonChartProps {
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

export function ReturnComparisonChart({ investments }: ReturnComparisonChartProps) {
  const data = useMemo(() => {
    const platformData = investments.reduce((acc, inv) => {
      if (!acc[inv.platform]) {
        acc[inv.platform] = {
          invested: 0,
          returns: 0,
          expectedReturn: 0,
          count: 0,
        };
      }
      acc[inv.platform].invested += inv.amount;
      acc[inv.platform].returns += inv.payments.reduce((sum, p) => sum + p.amount, 0);
      acc[inv.platform].expectedReturn += inv.expectedReturn;
      acc[inv.platform].count += 1;
      return acc;
    }, {} as Record<Platform, { invested: number; returns: number; expectedReturn: number; count: number }>);

    return Object.entries(platformData)
      .map(([platform, data]) => {
        const actualReturnPercent = data.invested > 0 
          ? (data.returns / data.invested) * 100 
          : 0;
        const avgExpectedReturn = data.count > 0 
          ? data.expectedReturn / data.count 
          : 0;

        return {
          name: PLATFORMS.find(p => p.value === platform)?.label || platform,
          platform: platform as Platform,
          'Rendimiento Real': parseFloat(actualReturnPercent.toFixed(1)),
          'Rendimiento Esperado': parseFloat(avgExpectedReturn.toFixed(1)),
        };
      })
      .sort((a, b) => b['Rendimiento Real'] - a['Rendimiento Real']);
  }, [investments]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          type="number" 
          unit="%" 
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          formatter={(value: number) => `${value}%`}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
        />
        <Legend />
        <Bar 
          dataKey="Rendimiento Real" 
          fill="hsl(142, 76%, 36%)" 
          radius={[0, 4, 4, 0]}
          name="Rendimiento Real (%)"
        />
        <Bar 
          dataKey="Rendimiento Esperado" 
          fill="hsl(217, 91%, 60%)" 
          radius={[0, 4, 4, 0]}
          name="Rentabilidad Anual Esperada (%)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
