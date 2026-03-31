import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import type { AdminDashboardData } from '@/hooks/useAdminDashboard';

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

interface Props {
  data: AdminDashboardData;
}

export default function AdminAnalyticsSection({ data }: Props) {
  const { platformMarketShare } = data;

  return (
    <div className="grid gap-4">
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
    </div>
  );
}
