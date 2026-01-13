import { Asset } from '@/types/asset';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, Building2, Globe } from 'lucide-react';

interface DistributionChartProps {
  assets: Asset[];
}

export function DistributionChart({ assets }: DistributionChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate distribution by asset type
  const typeDistribution = assets.reduce(
    (acc, asset) => {
      if (asset.assetType === 'LENDING') {
        acc.lending += asset.acquisitionCost;
      } else {
        acc.equity += asset.acquisitionCost;
      }
      return acc;
    },
    { lending: 0, equity: 0 }
  );

  // Calculate distribution by country (Spanish vs Foreign)
  const countryDistribution = assets.reduce(
    (acc, asset) => {
      if (asset.countryCode === 'ES') {
        acc.spanish += asset.acquisitionCost;
      } else {
        acc.foreign += asset.acquisitionCost;
      }
      return acc;
    },
    { spanish: 0, foreign: 0 }
  );

  const typeData = [
    { name: 'Préstamos (RCM)', value: typeDistribution.lending, color: 'hsl(var(--chart-1))' },
    { name: 'Participaciones (GPP)', value: typeDistribution.equity, color: 'hsl(var(--chart-2))' },
  ].filter(d => d.value > 0);

  const countryData = [
    { name: 'España', value: countryDistribution.spanish, color: 'hsl(var(--chart-3))' },
    { name: 'Extranjero', value: countryDistribution.foreign, color: 'hsl(var(--chart-4))' },
  ].filter(d => d.value > 0);

  const totalInvested = typeDistribution.lending + typeDistribution.equity;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalInvested) * 100).toFixed(1);
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Activos</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No hay activos para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex -space-x-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <Building2 className="h-4 w-4 text-purple-500" />
            </div>
            Por Tipo de Activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-muted-foreground">Préstamos</p>
                <p className="font-medium">{formatCurrency(typeDistribution.lending)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-muted-foreground">Participaciones</p>
                <p className="font-medium">{formatCurrency(typeDistribution.equity)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Country Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Por Origen Geográfico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {countryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇪🇸</span>
              <div>
                <p className="text-muted-foreground">España</p>
                <p className="font-medium">{formatCurrency(countryDistribution.spanish)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌍</span>
              <div>
                <p className="text-muted-foreground">Extranjero</p>
                <p className="font-medium">{formatCurrency(countryDistribution.foreign)}</p>
              </div>
            </div>
          </div>
          {countryDistribution.foreign > 50000 && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ Modelo 720 obligatorio
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                Activos en el extranjero superan 50.000€
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
