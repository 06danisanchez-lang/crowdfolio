import { useCallback, useMemo, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Banknote, CalendarClock, Lock, Crown, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePaymentsOverview, ReceivedPaymentRow, ExpectedPaymentRow } from '@/hooks/usePaymentsOverview';
import { Payment, InvestmentScheduleEntry } from '@/types/investment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaymentsViewProps {
  onProRequired?: () => void;
}

export function PaymentsView({ onProRequired }: PaymentsViewProps) {
  const { t } = useLanguage();
  const {
    received,
    expected,
    platformOptions,
    investmentOptions,
    isLoading,
    error,
    isLimited,
    lockedCount,
  } = usePaymentsOverview();

  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [investmentFilter, setInvestmentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const matchesFilters = useCallback((row: { platform: string; investmentId: string; date: string }) => {
    if (platformFilter !== 'all' && row.platform !== platformFilter) return false;
    if (investmentFilter !== 'all' && row.investmentId !== investmentFilter) return false;
    if (dateFrom || dateTo) {
      const d = parseISO(row.date);
      if (dateFrom && d < startOfDay(parseISO(dateFrom))) return false;
      if (dateTo && d > endOfDay(parseISO(dateTo))) return false;
    }
    return true;
  }, [platformFilter, investmentFilter, dateFrom, dateTo]);

  const filteredReceived = useMemo(() => received.filter(matchesFilters), [received, matchesFilters]);
  const filteredExpected = useMemo(() => expected.filter(matchesFilters), [expected, matchesFilters]);

  const filteredReceivedTotal = useMemo(
    () => filteredReceived.filter(r => r.type !== 'capital_return').reduce((sum, r) => sum + r.amount, 0),
    [filteredReceived],
  );
  const filteredExpectedTotal = useMemo(() => filteredExpected.reduce((sum, r) => sum + r.amount, 0), [filteredExpected]);

  const hasActiveFilters = platformFilter !== 'all' || investmentFilter !== 'all' || !!dateFrom || !!dateTo;

  const getPlatformLabel = (platform: string, customName?: string) =>
    platform === 'other' && customName ? customName : platformOptions.find(p => p.value === platform)?.label || platform;

  const getReceivedTypeLabel = (type: Payment['type']): string => {
    const map: Record<Payment['type'], string> = {
      interest: t('investments.detail.interest'),
      dividend: t('investments.detail.dividend'),
      principal: t('investments.detail.principal'),
      capital_return: t('investments.detail.capitalReturn'),
    };
    return map[type];
  };

  const getExpectedTypeLabel = (type: InvestmentScheduleEntry['type']): string => {
    const map: Record<InvestmentScheduleEntry['type'], string> = {
      interest: t('investments.schedule.type.interest'),
      principal: t('investments.schedule.type.principal'),
      mixed: t('investments.schedule.type.mixed'),
    };
    return map[type];
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Free plan locked investments banner */}
      {isLimited && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-900">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Plan gratuito</strong> — no se muestran los cobros de tus <strong>{lockedCount}</strong> inversión{lockedCount !== 1 ? 'es' : ''} bloqueada{lockedCount !== 1 ? 's' : ''}.
            </span>
          </div>
          {onProRequired && (
            <Button size="sm" variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100 shrink-0" onClick={onProRequired}>
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Activar Pro
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-[#e4ddcf] bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#3f3623]">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('common.platform')}</Label>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {platformOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('payments.filters.investment')}</Label>
            <Select value={investmentFilter} onValueChange={setInvestmentFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('payments.filters.allInvestments')}</SelectItem>
                {investmentOptions.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('payments.filters.dateFrom')}</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('payments.filters.dateTo')}</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setPlatformFilter('all'); setInvestmentFilter('all'); setDateFrom(''); setDateTo(''); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Recibidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-status-active" />
            {t('payments.received.title')}
            <span className="font-normal text-muted-foreground">({filteredReceived.length})</span>
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('payments.total.label')}</p>
            <p className="text-lg font-semibold text-[#253765]">{formatCurrency(filteredReceivedTotal)}</p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReceived.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('payments.received.empty')}</p>
          ) : (
            <div className="space-y-2">
              {filteredReceived.map((row: ReceivedPaymentRow) => (
                <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.investmentName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{getPlatformLabel(row.platform, row.customPlatformName)}</span>
                      <span>· {format(parseISO(row.date), 'dd/MM/yyyy', { locale: es })}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-xs">{getReceivedTypeLabel(row.type)}</Badge>
                    <span className={cn('font-semibold', row.type === 'capital_return' ? 'text-muted-foreground' : 'text-[#253765]')}>
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Esperados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            {t('payments.expected.title')}
            <span className="font-normal text-muted-foreground">({filteredExpected.length})</span>
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('payments.total.label')}</p>
            <p className="text-lg font-semibold text-[#253765]">{formatCurrency(filteredExpectedTotal)}</p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpected.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('payments.expected.empty')}</p>
          ) : (
            <div className="space-y-2">
              {filteredExpected.map((row: ExpectedPaymentRow) => (
                <div
                  key={row.id}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-md border p-3',
                    row.isOverdue && 'border-amber-300 bg-amber-50/50',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.investmentName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{getPlatformLabel(row.platform, row.customPlatformName)}</span>
                      <span>· {format(parseISO(row.date), 'dd/MM/yyyy', { locale: es })}</span>
                      <span className={row.isOverdue ? 'font-medium text-amber-700' : undefined}>
                        · {row.isOverdue
                          ? t('payments.overdueBy').replace('{days}', String(Math.abs(row.daysFromToday)))
                          : row.daysFromToday === 0
                            ? t('payments.dueToday')
                            : t('payments.inDays').replace('{days}', String(row.daysFromToday))}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-xs">{getExpectedTypeLabel(row.type)}</Badge>
                    <span className="font-semibold text-muted-foreground">{formatCurrency(row.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
