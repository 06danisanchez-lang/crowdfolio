import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Eye, 
  ArrowUpDown,
  Filter,
  Search
} from 'lucide-react';
import { Investment, PLATFORMS, STATUS_OPTIONS, Platform, InvestmentStatus } from '@/types/investment';
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
import { InvestmentForm } from './InvestmentForm';
import { InvestmentDetail } from './InvestmentDetail';

interface InvestmentListProps {
  investments: Investment[];
  onUpdate: (id: string, updates: Partial<Investment>) => void;
  onDelete: (id: string) => void;
  onAddPayment: (investmentId: string, payment: { date: string; amount: number; type: 'dividend' | 'principal' | 'interest'; notes?: string }) => void;
  onDeletePayment: (investmentId: string, paymentId: string) => void;
}

type SortField = 'projectName' | 'amount' | 'investmentDate' | 'expectedReturn' | 'status';
type SortDirection = 'asc' | 'desc';

export function InvestmentList({ 
  investments, 
  onUpdate, 
  onDelete,
  onAddPayment,
  onDeletePayment
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
                  <TableCell>{getStatusBadge(investment.status)}</TableCell>
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
                          onSubmit={(data) => onUpdate(investment.id, data)}
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
        onClose={() => setViewingInvestment(null)}
        onAddPayment={onAddPayment}
        onDeletePayment={onDeletePayment}
      />
    </div>
  );
}
