import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon, BarChart3, ActivityIcon } from 'lucide-react';
import type { AdminDashboardData } from '@/hooks/useAdminDashboard';

const PIE_COLORS = ['hsl(217, 91%, 60%)', 'hsl(271, 81%, 56%)'];
const BAR_COLOR = 'hsl(217, 91%, 60%)';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function RetentionGauge({ rate, usersWithTax, totalUsers }: { rate: number; usersWithTax: number; totalUsers: number }) {
  const radius = 80;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = (rate / 100) * circumference;

  return (
    <div className="flex h-[250px] flex-col items-center justify-center gap-2">
      <svg width={200} height={200} viewBox="0 0 200 200" className="drop-shadow-sm">
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          className="transition-all duration-700 ease-out"
        />
        <text x={100} y={92} textAnchor="middle" className="fill-foreground text-3xl font-bold" style={{ fontSize: 32 }}>
          {Math.round(rate)}%
        </text>
        <text x={100} y={116} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 13 }}>
          retención fiscal
        </text>
      </svg>
      <p className="text-center text-xs text-muted-foreground">
        {usersWithTax} de {totalUsers} usuarios han configurado su perfil fiscal
      </p>
    </div>
  );
}

interface Props {
  data: AdminDashboardData;
}

export default function AdminAnalyticsSection({ data }: Props) {
  const { assetAllocation, platformMarketShare, taxRetention } = data;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Asset Allocation Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <PieChartIcon className="h-4 w-4" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assetAllocation.length === 0 ? (
            <EmptyState icon={PieChartIcon} text="Sin activos clasificados" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={assetAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {assetAllocation.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Platform Market Share Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Market Share por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent>
          {platformMarketShare.length === 0 ? (
            <EmptyState icon={BarChart3} text="Sin inversiones registradas" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={platformMarketShare} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tax Retention Gauge */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ActivityIcon className="h-4 w-4" />
            Retención Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RetentionGauge
            rate={taxRetention.rate}
            usersWithTax={taxRetention.usersWithTax}
            totalUsers={taxRetention.totalUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
