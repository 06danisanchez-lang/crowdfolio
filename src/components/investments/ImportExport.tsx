import { useLanguage } from '@/contexts/LanguageContext';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { ImportInvestmentInput, Investment, PLATFORMS, STATUS_OPTIONS } from '@/types/investment';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ExistingInvestmentKey } from '@/lib/investment/importRows';
import { ImportInvestmentsDialog } from './ImportInvestmentsDialog';

interface ImportExportProps {
  investments: Investment[];
  /** Todas las del usuario, incluidos borradores: para no importar repetidas. */
  existing: ExistingInvestmentKey[];
  onImport: (investments: ImportInvestmentInput[], replace: boolean) => Promise<{ inserted: number; failed: number }>;
  exportData: () => string;
  isPro: boolean;
  currentActivePendingCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportExport({
  investments,
  existing,
  onImport,
  exportData,
  isPro,
  currentActivePendingCount,
}: ImportExportProps) {
  const { t } = useLanguage();
  // ── Export: JSON (unchanged) ───────────────────────────────────────────────

  const handleExportJSON = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inversiones-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('investments.exportSuccess'));
  };

  // ── Export: CSV (unchanged) ────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = [
      'Plataforma', 'Nombre Proyecto', 'Monto', 'Fecha Inversión',
      'Fecha Vencimiento', 'Rendimiento Esperado', 'Estado', 'Notas',
      'Modelo de Rendimiento', 'Frecuencia de Pago', 'Tipo Devolución Principal',
      'Vencimiento Prometido',
    ];
    const rows = investments.map(inv => [
      inv.platform === 'other' ? inv.customPlatformName || 'Otra' : PLATFORMS.find(p => p.value === inv.platform)?.label,
      inv.projectName,
      inv.amount,
      inv.investmentDate.split('T')[0],
      inv.expectedEndDate?.split('T')[0] || '',
      inv.expectedReturn,
      STATUS_OPTIONS.find(s => s.value === inv.status)?.label,
      inv.notes || '',
      inv.incomeModel || '',
      inv.paymentFrequency || '',
      inv.principalReturnType || '',
      inv.originalEndDate?.split('T')[0] || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inversiones-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('investments.exportCsvSuccess'));
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-2">
      <ImportInvestmentsDialog
        existing={existing}
        onImport={onImport}
        isPro={isPro}
        currentActivePendingCount={currentActivePendingCount}
      />

      {/* ── Export Dialog (unchanged) ── */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t('investments.export')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investments.exportTitle')}</DialogTitle>
            <DialogDescription>{t('investments.exportDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">{t('investments.exportJSON')}</h4>
              <p className="mb-3 text-sm text-muted-foreground">{t('investments.exportJSONDesc')}</p>
              <Button onClick={handleExportJSON}>
                <FileJson className="mr-2 h-4 w-4" />
                {t('investments.downloadJSON')}
              </Button>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">{t('investments.exportCSV')}</h4>
              <p className="mb-3 text-sm text-muted-foreground">{t('investments.exportCSVDesc')}</p>
              <Button onClick={handleExportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t('investments.downloadCSV')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
