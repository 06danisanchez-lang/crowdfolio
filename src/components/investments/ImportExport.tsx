import { useRef, useState } from 'react';
import { loadExcelJS } from '@/lib/lazy/exportLibs';
import { useLanguage } from '@/contexts/LanguageContext';
import { Upload, Download, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Investment, PLATFORMS, STATUS_OPTIONS } from '@/types/investment';
import { PLAN_FEATURES } from '@/lib/stripe/config';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  investmentsArraySchema,
  MAX_IMPORT_FILE_SIZE,
  MAX_INVESTMENTS_PER_IMPORT,
} from '@/lib/validation/investmentSchema';
import { ZodError } from 'zod';
import { parseImportDate } from '@/lib/investment/parseImportDate';
import { buildInvestmentFromRow, RawRow } from '@/lib/investment/importRows';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportExportProps {
  investments: Investment[];
  onImport: (investments: Investment[], replace: boolean) => void;
  exportData: () => string;
  isPro: boolean;
  currentActivePendingCount: number;
}


interface PendingImport {
  toInsert: Investment[];
  activeCount: number;
  draftCount: number;
  skippedCount: number;
}

// ─── Header normalization ─────────────────────────────────────────────────────
// Accepts both the Spanish labels used in CSV export and the internal field keys

const HEADER_MAP: Record<string, string> = {
  'plataforma': 'platform',
  'nombre proyecto': 'projectName',
  'monto': 'amount',
  'fecha inversión': 'investmentDate',
  'fecha inversion': 'investmentDate',
  'fecha inversión (yyyy-mm-dd)': 'investmentDate',
  'fecha inversion (yyyy-mm-dd)': 'investmentDate',
  'fecha vencimiento': 'expectedEndDate',
  'fecha vencimiento (yyyy-mm-dd)': 'expectedEndDate',
  'rendimiento esperado': 'expectedReturn',
  'rendimiento esperado (%)': 'expectedReturn',
  'notas': 'notes',
  'modelo de rendimiento': 'incomeModel',
  'modelo rendimiento': 'incomeModel',
  'incomemodel': 'incomeModel',
  'frecuencia de pago': 'paymentFrequency',
  'frecuencia pago': 'paymentFrequency',
  'paymentfrequency': 'paymentFrequency',
  'tipo devolución principal': 'principalReturnType',
  'tipo devolucion principal': 'principalReturnType',
  'principalreturntype': 'principalReturnType',
};

function normalizeHeader(h: string): string | null {
  const key = h.toLowerCase().replace(/\s+/g, ' ').trim();
  return HEADER_MAP[key] ?? null;
}

function buildColumnMap(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  headers.forEach((h, i) => {
    const field = normalizeHeader(h);
    if (field) map[i] = field;
  });
  return map;
}

function mapRow(values: string[], colMap: Record<number, string>): RawRow {
  const row: RawRow = {};
  Object.entries(colMap).forEach(([idx, field]) => {
    row[field] = values[parseInt(idx)] ?? '';
  });
  return row;
}

// ─── CSV parser (by header name, handles quoted fields) ───────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvToRows(text: string): RawRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('El archivo debe tener al menos una cabecera y una fila de datos');
  const colMap = buildColumnMap(parseCsvLine(lines[0]));
  return lines.slice(1).map(line => mapRow(parseCsvLine(line), colMap));
}

// ─── XLSX parser (ExcelJS, client-side) ──────────────────────────────────────

function excelCellToString(v: unknown): string {
  if (v == null) return '';
  // ExcelJS devuelve las celdas de fecha como Date en UTC (Excel no guarda zona
  // horaria), así que aquí sí hay que leer el día en UTC.
  if (v instanceof Date) return v.toISOString().split('T')[0];
  // Números: la celda ya es un número sin ambigüedad. Se pasa a texto con coma
  // decimal ("1500,125") para que parseImportNumber (formato español) no lo
  // confunda con un separador de miles.
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (Array.isArray(obj.richText))
      return (obj.richText as Array<{ text: string }>).map(r => r.text).join('');
    if (obj.result != null) return String(obj.result);
    if (obj.text != null) return String(obj.text);
  }
  return String(v);
}

async function parseXlsxToRows(buffer: ArrayBuffer): Promise<RawRow[]> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.worksheets[0];
  if (!ws) throw new Error('El archivo Excel no contiene hojas');

  const rowsData: string[][] = [];
  ws.eachRow(row => {
    // row.values is 1-indexed; slice(1) drops the leading undefined
    rowsData.push((row.values as unknown[]).slice(1).map(excelCellToString));
  });

  if (rowsData.length < 2) throw new Error('El archivo debe tener al menos una cabecera y una fila de datos');
  const colMap = buildColumnMap(rowsData[0]);
  return rowsData.slice(1).map(vals => mapRow(vals, colMap));
}

/** JSON: deja todas las fechas de columnas `date` en 'YYYY-MM-DD' (ver parseImportDate). */
function normalizeImportedDates(inv: Investment): Investment {
  return {
    ...inv,
    investmentDate: parseImportDate(inv.investmentDate) ?? inv.investmentDate,
    expectedEndDate: inv.expectedEndDate ? (parseImportDate(inv.expectedEndDate) ?? inv.expectedEndDate) : inv.expectedEndDate,
    firstPaymentDate: inv.firstPaymentDate ? (parseImportDate(inv.firstPaymentDate) ?? inv.firstPaymentDate) : inv.firstPaymentDate,
    payments: (inv.payments ?? []).map(p => ({ ...p, date: parseImportDate(p.date) ?? p.date })),
  };
}

// ─── Zod error helper (unchanged) ────────────────────────────────────────────

const formatZodError = (error: ZodError): string => {
  const issues = error.issues.slice(0, 3);
  const messages = issues.map(issue => {
    const path = issue.path.join(' → ');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  const remaining = error.issues.length - 3;
  if (remaining > 0) messages.push(`... y ${remaining} errores más`);
  return messages.join('\n');
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportExport({
  investments,
  onImport,
  exportData,
  isPro,
  currentActivePendingCount,
}: ImportExportProps) {
  const { t } = useLanguage();
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importStep, setImportStep] = useState<'idle' | 'preview'>('idle');
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImportState = () => {
    setImportStep('idle');
    setPendingImport(null);
    setImportError(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setImportOpen(open);
    if (!open) resetImportState();
  };

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

  // ── Import: CSV / XLSX / JSON ─────────────────────────────────────────────

  const processRows = (rows: RawRow[]) => {
    const active: Investment[] = [];
    const drafts: Investment[] = [];

    for (const raw of rows) {
      const [investment, complete] = buildInvestmentFromRow(raw);
      if (complete) active.push(investment);
      else drafts.push(investment);
    }

    const freeLimit = PLAN_FEATURES.free.investments;
    const slotsAvailable = isPro ? Infinity : Math.max(0, freeLimit - currentActivePendingCount);
    const activeToInsert = isPro ? active : active.slice(0, slotsAvailable);
    const skippedCount = active.length - activeToInsert.length;

    setPendingImport({
      toInsert: [...activeToInsert, ...drafts],
      activeCount: activeToInsert.length,
      draftCount: drafts.length,
      skippedCount,
    });
    setImportStep('preview');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setImportError(null);

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setImportError(`El archivo es demasiado grande. Máximo permitido: ${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    try {
      const ext = file.name.toLowerCase().split('.').pop();

      // JSON: delegate to the existing JSON handler path
      if (ext === 'json') {
        const text = await file.text();
        let parsedData: unknown;
        try { parsedData = JSON.parse(text); }
        catch { throw new Error('El archivo no contiene JSON válido'); }
        if (!Array.isArray(parsedData)) throw new Error('El archivo debe contener un array de inversiones');
        if (parsedData.length > MAX_INVESTMENTS_PER_IMPORT)
          throw new Error(`Demasiadas inversiones. Máximo permitido: ${MAX_INVESTMENTS_PER_IMPORT}`);
        const validatedData = (investmentsArraySchema.parse(parsedData) as Investment[]).map(normalizeImportedDates);
        onImport(validatedData, false);
        setImportOpen(false);
        toast.success(t('investments.importSuccess').replace('{n}', String(validatedData.length)));
        return;
      }

      let rows: RawRow[];
      if (ext === 'xlsx') {
        const buffer = await file.arrayBuffer();
        rows = await parseXlsxToRows(buffer);
      } else {
        const text = await file.text();
        rows = parseCsvToRows(text);
      }
      if (rows.length === 0) throw new Error('No se encontraron filas de datos en el archivo');
      if (rows.length > MAX_INVESTMENTS_PER_IMPORT)
        throw new Error(`Demasiadas filas. Máximo permitido: ${MAX_INVESTMENTS_PER_IMPORT}`);
      processRows(rows);
    } catch (error) {
      if (error instanceof ZodError) setImportError(`Error de validación:\n${formatZodError(error)}`);
      else if (error instanceof Error) setImportError(error.message);
      else setImportError('Error al procesar el archivo');
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    onImport(pendingImport.toInsert, false);
    setImportOpen(false);
    resetImportState();
    const { activeCount, draftCount, skippedCount } = pendingImport;
    const parts: string[] = [];
    if (activeCount > 0) parts.push(`${activeCount} activa${activeCount !== 1 ? 's' : ''}`);
    if (draftCount > 0) parts.push(`${draftCount} borrador${draftCount !== 1 ? 'es' : ''} pendiente${draftCount !== 1 ? 's' : ''} de completar`);
    let msg = `${activeCount + draftCount} inversiones importadas: ${parts.join(', ')}.`;
    if (skippedCount > 0) msg += ` ${skippedCount} omitida${skippedCount !== 1 ? 's' : ''} por límite de plan.`;
    toast.success(msg);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-2">
      {/* ── Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={handleDialogOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            {t('investments.import')}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('investments.importTitle')}</DialogTitle>
            <DialogDescription>
              {importStep === 'idle' ? t('investments.importDesc') : 'Revisa el resumen antes de confirmar la importación.'}
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{importError}</AlertDescription>
            </Alert>
          )}

          {importStep === 'idle' ? (
            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t('investments.selectFile')}
              </Button>
            </div>
          ) : (
            /* Preview / confirmation step */
            pendingImport && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg border divide-y text-sm">
                  {pendingImport.activeCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <div>
                        <p className="font-medium">{pendingImport.activeCount} inversión{pendingImport.activeCount !== 1 ? 'es' : ''} con todos los campos</p>
                        <p className="text-muted-foreground text-xs">Se registrarán como activas</p>
                      </div>
                    </div>
                  )}
                  {pendingImport.draftCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Info className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="font-medium">{pendingImport.draftCount} borrador{pendingImport.draftCount !== 1 ? 'es' : ''}</p>
                        <p className="text-muted-foreground text-xs">Faltan campos obligatorios — se guardarán como borradores para completar</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Plan limit warning */}
                {pendingImport.skippedCount > 0 && (
                  <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 dark:text-amber-300 text-sm">
                      Puedes importar {pendingImport.activeCount} inversión{pendingImport.activeCount !== 1 ? 'es' : ''} activa{pendingImport.activeCount !== 1 ? 's' : ''}.
                      Las {pendingImport.skippedCount} restantes no se importarán por límite de tu plan Free (máximo 3 activas).
                    </AlertDescription>
                  </Alert>
                )}

                {pendingImport.activeCount === 0 && pendingImport.draftCount === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No hay inversiones para importar.</p>
                )}

                <DialogFooter className="flex gap-2 sm:gap-2">
                  <Button variant="outline" onClick={resetImportState}>
                    Atrás
                  </Button>
                  <Button
                    onClick={confirmImport}
                    disabled={pendingImport.activeCount + pendingImport.draftCount === 0}
                    className="flex-1"
                  >
                    Confirmar importación
                  </Button>
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

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
