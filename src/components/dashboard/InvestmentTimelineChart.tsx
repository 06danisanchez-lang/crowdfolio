import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Investment } from '@/types/investment';
import { format, parseISO, startOfMonth, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface InvestmentTimelineChartProps {
  investments: Investment[];
}

export function InvestmentTimelineChart({ investments }: InvestmentTimelineChartProps) {
  const data = useMemo(() => {
    if (investments.length === 0) return [];

    const sortedInvestments = [...investments].sort(
      (a, b) => new Date(a.investmentDate).getTime() - new Date(b.investmentDate).getTime()
    );

    const firstDate = parseISO(sortedInvestments[0].investmentDate);
    const lastDate = new Date();

    const months = eachMonthOfInterval({ start: startOfMonth(firstDate), end: lastDate });

    let cumulativeInvested = 0;
    let cumulativeReturns = 0;

    return months.map(month => {
      // Add investments made in this month
      const monthInvestments = investments.filter(inv => 
        isSameMonth(parseISO(inv.investmentDate), month)
      );
      cumulativeInvested += monthInvestments.reduce((sum, inv) => sum + inv.amount, 0);

      // Add returns received in this month
      const monthReturns = investments.flatMap(inv => inv.payments)
        .filter(payment => isSameMonth(parseISO(payment.date), month))
        .reduce((sum, payment) => sum + payment.amount, 0);
      cumulativeReturns += monthReturns;

      return {
        month: format(month, 'MMM yy', { locale: es }),
        invertido: cumulativeInvested,
        retornos: cumulativeReturns,
      };
    });
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
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorInvertido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorRetornos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis 
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
        />
        <Area
          type="monotone"
          dataKey="invertido"
          name="Capital Invertido"
          stroke="hsl(217, 91%, 60%)"
          fillOpacity={1}
          fill="url(#colorInvertido)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="retornos"
          name="Retornos Recibidos"
          stroke="hsl(142, 76%, 36%)"
          fillOpacity={1}
          fill="url(#colorRetornos)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
