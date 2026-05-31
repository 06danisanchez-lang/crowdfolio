import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Trash2,
  Eye,
  ArrowUpDown,
  Filter,
  Search,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { Investment, DraftInvestment, PLATFORMS, STATUS_OPTIONS, Platform, InvestmentStatus, IncomeModel, InvestmentScheduleEntry } from '@/types/investment';
import { getInvestmentCompletionStatus } from '@/lib/investment/completeness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { InvestmentForm } from './InvestmentForm';
import { InvestmentDetail } from './InvestmentDetail';
import { MaturityConfirmationModal } from './MaturityConfirmationModal';

interface InvestmentListProps {
  activeInvestments: Investment[];
  completedInvestments: Investment[];
  incompleteInvestments?: DraftInvestment[];
  scheduleMap?: Record<string, InvestmentScheduleEntry[]>;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<{ demotedToDraft?: boolean } | void> | void;
  onDelete: (id: string) => void;
  onAddPayment: (investmentId: string, payment: { date: string; amount: number; type: 'dividend' | 'principal' | 'interest'; notes?: string }) => void;
  onDeletePayment: (investmentId: string, paymentId: string) => void;
  allowDraftSave?: boolean;
  initialStatusFilter?: InvestmentStatus | 'all';
  openInvestmentId?: string | null;
  onInvestmentOpened?: () => void;
}

type SortField = 'projectName' | 'amount' | 'investmentDate' | 'expectedReturn' | 'status';
type SortDirection = 'asc' | 'desc';

const ACTIVE_STATUS_OPTIONS = STATUS_OPTIONS.filter(s => s.value !== 'draft' && s.value !== 'completed');

export function InvestmentList({
  activeInvestments,
  completedInvestments,
  incompleteInvestments = [],
  scheduleMap = {},
  onUpdate,
  onDelete,
  onAddPayment,
  onDeletePayment,
  allowDraftSave,
  initialStatusFilter = 'all',
  openInvestmentId,
  onInvestmentOpened,
}: InvestmentListProps) {
  const { t } = useLanguage();

  // Section open state — active opens automatically when coming from KPI card
  const [activeOpen, setActiveOpen] = useState(initialStatusFilter !== 'all');
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  // Filters & sort (active section only)
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<InvestmentStatus | 'all'>(initialStatusFilter);
  const [sortField, setSortField] = useState<SortField>('investmentDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingInvestmentId, setViewingInvestmentId] = useState<string | null>(null);
  const [confirmingMaturityId, setConfirmingMaturityId] = useState<string | null>(null);

  // Both derived in real-time so dialogs always reflect the latest data.
  const viewingInvestment = useMemo(
    () => [...activeInvestments, ...completedInvestments].find(inv => inv.id === viewingInvestmentId) ?? null,
    [viewingInvestmentId, activeInvestments, completedInvestments],
  );

  const confirmingMaturityInvestment = useMemo(
    () => [...activeInvestments, ...completedInvestments].find(inv => inv.id === confirmingMaturityId) ?? null,
    [confirmingMaturityId, activeInvestments, completedInvestments],
  );

  useEffect(() => {
    if (!openInvestmentId) return;
    const match = [...activeInvestments, ...completedInvestments].find(inv => inv.id === openInvestmentId);
    if (match) {
      if (match.status === 'pending') {
        setConfirmingMaturityId(match.id);
      } else {
        setViewingInvestmentId(match.id);
      }
      onInvestmentOpened?.();
    }
  }, [openInvestmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const getPlatformLabel = (platform: Platform, customName?: string) => {
    if (platform === 'other' && customName) return customName;
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  const getStatusBadge = (status: InvestmentStatus, investmentId?: string) => {
    const colorMap: Record<InvestmentStatus, string> = {
      draft: 'bg-muted text-muted-foreground',
      active: 'bg-status-active text-white',
      pending: 'bg-status-pending text-white cursor-pointer hover:opacity-80',
      completed: 'bg-status-completed text-white',
      defaulted: 'bg-status-defaulted text-white',
    };
    const labelMap: Record<InvestmentStatus, string> = {
      draft: 'Borrador',
      active: 'Activa',
      pending: '⏰ Por confirmar',
      completed: 'Completada',
      defaulted: 'Default',
    };
    if (status === 'pending' && investmentId) {
      return (
        <Badge
          className={colorMap.pending}
          onClick={(e) => { e.stopPropagation(); setConfirmingMaturityId(investmentId); }}
        >
          {labelMap.pending}
        </Badge>
      );
    }
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={colorMap[status]}>{labelMap[status] ?? statusOption?.label ?? status}</Badge>;
  };

  const getIncomeModelShortKey = (model: IncomeModel): string => {
    const map: Record<IncomeModel, string> = {
      bullet: 'investments.incomeModel.short.bullet',
      periodic_fixed: 'investments.incomeModel.short.periodicFixed',
      amortizing: 'investments.incomeModel.short.amortizing',
      variable_or_unknown: 'investments.incomeModel.short.variableOrUnknown',
    };
    return map[model];
  };

  const isNoForecast = (inv: Investment): boolean => {
    const status = getInvestmentCompletionStatus({
      platform: inv.platform,
      projectName: inv.projectName,
      amount: inv.amount,
      investmentDate: inv.investmentDate,
      expectedReturn: inv.expectedReturn,
      expectedEndDate: inv.expectedEndDate,
      incomeModel: inv.incomeModel,
      paymentFrequency: inv.paymentFrequency,
      hasSchedule: (scheduleMap[inv.id]?.length ?? 0) > 0,
      status: inv.status,
    });
    return status.isPortfolioReady && !status.isForecastReady;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedInvestments = activeInvestments
    .filter(inv => {
      const matchesSearch = inv.projectName.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || inv.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesPlatform && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'projectName': comparison = a.projectName.localeCompare(b.projectName); break;
        case 'amount': comparison = a.amount - b.amount; break;
        case 'investmentDate': comparison = new Date(a.investmentDate).getTime() - new Date(b.investmentDate).getTime(); break;
        case 'expectedReturn': comparison = a.expectedReturn - b.expectedReturn; break;
        case 'status': comparison = a.status.localeCompare(b.status); break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  // Shared section header style
  const SectionHeader = ({
    open,
    icon: Icon,
    label,
    count,
  }: {
    open: boolean;
    icon: React.ElementType;
    label: string;
    count: number;
  }) => (
    <div className="flex w-full items-center justify-between px-4 py-3 text-left">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#3f3623]/70 shrink-0" />
        <span className="font-semibold text-sm text-[#3f3623]">
          {label}
          <span className="ml-1.5 font-normal text-[#3f3623]/60">({count})</span>
        </span>
      </div>
      <ChevronDown className={cn('h-4 w-4 text-[#3f3623]/70 transition-transform duration-200', open && 'rotate-180')} />
    </div>
  );

  return (
    <div className="space-y-2">

      {/* ── Inversiones activas ───────────────────────────────────── */}
      <Collapsible open={activeOpen} onOpenChange={setActiveOpen}>
        <div className="rounded-lg overflow-hidden border border-[#e4ddcf]">
          <CollapsibleTrigger className="w-full bg-[#e4ddcf] hover:bg-[#d9d1c3] transition-colors">
            <SectionHeader open={activeOpen} icon={Wallet} label={t('investments.section.active')} count={activeInvestments.length} />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('investments.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as Platform | 'all')}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder={t('common.platform')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvestmentStatus | 'all')}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t('common.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.allStatuses')}</SelectItem>
                      {ACTIVE_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('projectName')}>
                          {t('investments.table.project')}<ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>{t('investments.table.platform')}</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('amount')}>
                          {t('investments.table.amount')}<ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('investmentDate')}>
                          {t('investments.table.date')}<ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('expectedReturn')}>
                          {t('investments.table.return')}<ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('status')}>
                          {t('investments.table.status')}<ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedInvestments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {t('investments.empty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedInvestments.map(inv => (
                        <TableRow key={inv.id} className="cursor-pointer hover:bg-accent/50">
                          <TableCell className="font-medium">{inv.projectName}</TableCell>
                          <TableCell>{getPlatformLabel(inv.platform, inv.customPlatformName)}</TableCell>
                          <TableCell>{formatCurrency(inv.amount)}</TableCell>
                          <TableCell>{format(parseISO(inv.investmentDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
                          <TableCell>{inv.expectedReturn.toFixed(1)}%</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              {getStatusBadge(inv.status, inv.id)}
                              {(inv.notes ?? '').includes('[DISPUTA]') && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                  ⚠️ Disputa
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {t(getIncomeModelShortKey(inv.incomeModel))}
                              </Badge>
                              {isNoForecast(inv) && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  {t('investments.badge.noForecast')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => setViewingInvestmentId(inv.id)}>
                              <Eye className="h-4 w-4 mr-1.5" />{t('common.view')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* ── Pendientes de completar ───────────────────────────────── */}
      <Collapsible open={incompleteOpen} onOpenChange={setIncompleteOpen}>
        <div className="rounded-lg overflow-hidden border border-[#e4ddcf]">
          <CollapsibleTrigger className="w-full bg-[#e4ddcf] hover:bg-[#d9d1c3] transition-colors">
            <SectionHeader open={incompleteOpen} icon={AlertTriangle} label={t('investments.incomplete.title')} count={incompleteInvestments.length} />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4">
              {incompleteInvestments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t('investments.incomplete.empty')}</p>
              ) : (
                <div className="space-y-2">
                  {incompleteInvestments.map(draft => {
                    const status = getInvestmentCompletionStatus({
                      platform: draft.platform,
                      projectName: draft.projectName,
                      amount: draft.amount,
                      investmentDate: draft.investmentDate,
                      expectedReturn: draft.expectedReturn,
                      expectedEndDate: draft.expectedEndDate,
                      incomeModel: draft.incomeModel,
                      status: draft.status,
                    });
                    return (
                      <div key={draft.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-md border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{draft.projectName || t('investments.incomplete.noName')}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {draft.platform && (
                              <span className="text-xs text-muted-foreground">
                                {getPlatformLabel(draft.platform as Platform, draft.customPlatformName)}
                              </span>
                            )}
                            {draft.amount != null && draft.amount > 0 && (
                              <span className="text-xs text-muted-foreground">· {formatCurrency(draft.amount)}</span>
                            )}
                            {draft.investmentDate && (
                              <span className="text-xs text-muted-foreground">· {draft.investmentDate}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {(draft.status as string) === 'draft' ? t('investments.incomplete.statusDraft') : t('investments.incomplete.status')}
                            </Badge>
                            {status.missingFields.map(field => (
                              <Badge key={field} variant="outline" className="text-xs text-muted-foreground">
                                {t(field)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <InvestmentForm
                            initialData={{
                              ...draft,
                              platform: draft.platform as Platform,
                              projectName: draft.projectName || '',
                              amount: draft.amount ?? 0,
                              investmentDate: draft.investmentDate || '',
                              expectedReturn: draft.expectedReturn ?? 0,
                              incomeModel: (draft.incomeModel as IncomeModel) || undefined,
                              status: draft.status,
                              payments: draft.payments,
                              createdAt: draft.createdAt,
                              updatedAt: draft.updatedAt,
                              id: draft.id,
                            } as Investment}
                            isDraft
                            onSubmit={async (data) => {
                              const result = await onUpdate(draft.id, data);
                              if (result && 'demotedToDraft' in result && result.demotedToDraft) {
                                toast.warning('La inversión ha pasado a pendientes por faltar datos obligatorios.');
                              }
                            }}
                            onSubmitDraft={allowDraftSave ? async (data) => { await onUpdate(draft.id, data); } : undefined}
                            trigger={
                              <Button variant="outline" size="sm">{t('investments.incomplete.cta')}</Button>
                            }
                          />
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(draft.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* ── Completadas ───────────────────────────────────────────── */}
      <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
        <div className="rounded-lg overflow-hidden border border-[#e4ddcf]">
          <CollapsibleTrigger className="w-full bg-[#e4ddcf] hover:bg-[#d9d1c3] transition-colors">
            <SectionHeader open={completedOpen} icon={CheckCircle2} label={t('investments.section.completed')} count={completedInvestments.length} />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4">
              {completedInvestments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t('investments.section.completedEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  {[...completedInvestments]
                    .sort((a, b) => (a.status === 'pending' ? -1 : b.status === 'pending' ? 1 : 0))
                    .map(inv => (
                    <div
                      key={inv.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-md border",
                        inv.status === 'pending' && "border-yellow-300 bg-yellow-50/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inv.projectName}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <span>{getPlatformLabel(inv.platform, inv.customPlatformName)}</span>
                          <span>· {formatCurrency(inv.amount)}</span>
                          <span>· {inv.expectedReturn.toFixed(1)}%</span>
                          {inv.expectedEndDate && (
                            <span>· {format(parseISO(inv.expectedEndDate), 'dd/MM/yyyy', { locale: es })}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {getStatusBadge(inv.status, inv.id)}
                          {(inv.notes ?? '').includes('[DISPUTA]') && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                              ⚠️ Disputa
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {t(getIncomeModelShortKey(inv.incomeModel))}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {inv.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-status-pending text-white hover:bg-status-pending/90"
                            onClick={() => setConfirmingMaturityId(inv.id)}
                          >
                            Confirmar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setViewingInvestmentId(inv.id)}>
                          <Eye className="h-4 w-4 mr-1.5" />{t('common.view')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* ── Diálogos ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('investments.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('investments.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvestmentDetail
        investment={viewingInvestment}
        schedule={viewingInvestment ? (scheduleMap[viewingInvestment.id] || []) : []}
        onClose={() => setViewingInvestmentId(null)}
        onUpdate={onUpdate}
        onDelete={(id) => { onDelete(id); setViewingInvestmentId(null); }}
        onAddPayment={onAddPayment}
        onDeletePayment={onDeletePayment}
      />

      <MaturityConfirmationModal
        investment={confirmingMaturityInvestment}
        onClose={() => setConfirmingMaturityId(null)}
        onUpdate={onUpdate}
      />
    </div>
  );
}
