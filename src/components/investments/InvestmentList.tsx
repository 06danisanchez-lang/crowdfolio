import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye, 
  ArrowUpDown,
  Filter,
  Search,
  AlertTriangle,
  ChevronDown
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { InvestmentForm } from './InvestmentForm';
import { InvestmentDetail } from './InvestmentDetail';

interface InvestmentListProps {
  investments: Investment[];
  incompleteInvestments?: DraftInvestment[];
  scheduleMap?: Record<string, InvestmentScheduleEntry[]>;
  onUpdate: (id: string, updates: Partial<Investment>) => Promise<{ demotedToDraft?: boolean } | void> | void;
  onDelete: (id: string) => void;
  onAddPayment: (investmentId: string, payment: { date: string; amount: number; type: 'dividend' | 'principal' | 'interest'; notes?: string }) => void;
  onDeletePayment: (investmentId: string, paymentId: string) => void;
  allowDraftSave?: boolean;
}

type SortField = 'projectName' | 'amount' | 'investmentDate' | 'expectedReturn' | 'status';
type SortDirection = 'asc' | 'desc';

export function InvestmentList({ 
  investments, 
  incompleteInvestments = [],
  scheduleMap = {},
  onUpdate, 
  onDelete,
  onAddPayment,
  onDeletePayment,
  allowDraftSave
}: InvestmentListProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<InvestmentStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('investmentDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingInvestment, setViewingInvestment] = useState<Investment | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPlatformLabel = (platform: Platform, customName?: string) => {
    if (platform === 'other' && customName) return customName;
    return PLATFORMS.find(p => p.value === platform)?.label || platform;
  };

  const getStatusBadge = (status: InvestmentStatus) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    const colorMap: Record<InvestmentStatus, string> = {
      draft: 'bg-muted text-muted-foreground',
      active: 'bg-status-active text-white',
      pending: 'bg-status-pending text-white',
      completed: 'bg-status-completed text-white',
      defaulted: 'bg-status-defaulted text-white',
    };
    return (
      <Badge className={colorMap[status]}>
        {statusOption?.label || status}
      </Badge>
    );
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

  const filteredAndSortedInvestments = investments
    .filter(inv => {
      const matchesSearch = inv.projectName.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || inv.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesPlatform && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'projectName':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'investmentDate':
          comparison = new Date(a.investmentDate).getTime() - new Date(b.investmentDate).getTime();
          break;
        case 'expectedReturn':
          comparison = a.expectedReturn - b.expectedReturn;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Incomplete investments section */}
      <Collapsible defaultOpen={incompleteInvestments.length > 0}>
        <div className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-3">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold flex-1">
              {t('investments.incomplete.title')} ({incompleteInvestments.length})
            </h3>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
          {incompleteInvestments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('investments.incomplete.empty')}</p>
          ) : (
          <div className="space-y-2">
            {incompleteInvestments.map((draft) => {
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
                <div key={draft.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-md bg-background border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{draft.projectName || t('investments.incomplete.noName')}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {draft.platform && (
                        <span className="text-xs text-muted-foreground">
                          {getPlatformLabel(draft.platform as Platform, draft.customPlatformName)}
                        </span>
                      )}
                    {draft.amount != null && draft.amount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          · {formatCurrency(draft.amount)}
                        </span>
                      )}
                      {draft.investmentDate && (
                        <span className="text-xs text-muted-foreground">
                          · {draft.investmentDate}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {(draft.status as string) === 'draft' ? t('investments.incomplete.statusDraft') : t('investments.incomplete.status')}
                      </Badge>
                      {status.missingFields.map(field => (
                        <Badge key={field} variant="outline" className="text-xs text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700">
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
                        incomeModel: draft.incomeModel || 'bullet',
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
                      onSubmitDraft={allowDraftSave ? async (data) => {
                        await onUpdate(draft.id, data);
                      } : undefined}
                      trigger={
                        <Button variant="outline" size="sm">
                          {t('investments.incomplete.cta')}
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(draft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </CollapsibleContent>
        </div>
      </Collapsible>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
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
              {PLATFORMS.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>
                  {platform.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvestmentStatus | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allStatuses')}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('projectName')}>
                  {t('investments.table.project')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>{t('investments.table.platform')}</TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('amount')}>
                  {t('investments.table.amount')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('investmentDate')}>
                  {t('investments.table.date')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('expectedReturn')}>
                  {t('investments.table.return')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('status')}>
                  {t('investments.table.status')}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[70px]"></TableHead>
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
              filteredAndSortedInvestments.map((investment) => (
                <TableRow key={investment.id} className="cursor-pointer hover:bg-accent/50">
                  <TableCell className="font-medium">{investment.projectName}</TableCell>
                  <TableCell>{getPlatformLabel(investment.platform, investment.customPlatformName)}</TableCell>
                  <TableCell>{formatCurrency(investment.amount)}</TableCell>
                  <TableCell>{format(parseISO(investment.investmentDate), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell>{investment.expectedReturn.toFixed(1)}%</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {getStatusBadge(investment.status)}
                      <Badge variant="outline" className="text-xs">
                        {t(getIncomeModelShortKey(investment.incomeModel))}
                      </Badge>
                      {isNoForecast(investment) && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {t('investments.badge.noForecast')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingInvestment(investment)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('common.view')}
                        </DropdownMenuItem>
                        <InvestmentForm
                          initialData={investment}
                          onSubmit={async (data) => {
                            const result = await onUpdate(investment.id, data);
                            if (result && 'demotedToDraft' in result && result.demotedToDraft) {
                              toast.warning('La inversión ha pasado a pendientes por faltar datos obligatorios.');
                            }
                          }}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                          }
                        />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(investment.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('investments.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('investments.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Investment Detail Dialog */}
      <InvestmentDetail
        investment={viewingInvestment}
        schedule={viewingInvestment ? (scheduleMap[viewingInvestment.id] || []) : []}
        onClose={() => setViewingInvestment(null)}
        onAddPayment={onAddPayment}
        onDeletePayment={onDeletePayment}
      />
    </div>
  );
}
