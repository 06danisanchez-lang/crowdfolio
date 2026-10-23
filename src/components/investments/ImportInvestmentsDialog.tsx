import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Info, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ZodError } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportInvestmentInput, Investment, Platform, PLATFORMS } from '@/types/investment';
import { PLAN_FEATURES } from '@/lib/stripe/config';
import { investmentsArraySchema, MAX_IMPORT_FILE_SIZE, MAX_INVESTMENTS_PER_IMPORT } from '@/lib/validation/investmentSchema';
import { parseImportDate } from '@/lib/investment/parseImportDate';
import {
  ColumnMapping, detectHeaderRow, FIELD_LABEL, gridToRows, guessMapping, IMPORT_FIELDS, ImportField,
} from '@/lib/investment/importSheet';
import { buildImportCandidates, ExistingInvestmentKey, ImportCandidate } from '@/lib/investment/importRows';
import { pickBestSheet, readSpreadsheetFile, SheetData } from '@/lib/investment/readSpreadsheet';
import { downloadImportTemplate } from '@/lib/investment/importTemplate';
import { formatCurrency } from '@/lib/tax/calculations';

/**
 * Importar inversiones desde cualquier Excel o CSV.
 *
 * 1. El usuario sube su archivo (el suyo propio, el que descarga de la
 *    plataforma o nuestra plantilla).
 * 2. Proponemos qué es cada columna; él puede corregirlo. Si el archivo no dice
 *    la plataforma, la elige para todo el archivo.
 * 3. Vista previa: qué inversiones quedan listas y a cuáles les falta algo.
 *    Las que ya están en su cartera no se vuelven a importar.
 * 4. Se guarda todo: lo que falta queda en «Pendientes de completar».
 */

interface Props {
  existing: ExistingInvestmentKey[];
  onImport: (investments: ImportInvestmentInput[], replace: boolean) => Promise<{ inserted: number; failed: number }>;
  isPro: boolean;
  currentActivePendingCount: number;
}

const NONE = '__none__';
const FILE_PLATFORM_NONE = '__none__';

function columnLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** JSON exportado por Crowdfolio: todas las fechas a 'YYYY-MM-DD' (ver parseImportDate). */
function normalizeImportedDates(inv: Investment): Investment {
  const d = (v?: string | null) => (v ? (parseImportDate(v) ?? v) : v);
  return {
    ...inv,
    investmentDate: parseImportDate(inv.investmentDate) ?? inv.investmentDate,
    expectedEndDate: d(inv.expectedEndDate) ?? undefined,
    originalEndDate: d(inv.originalEndDate),
    interestEndDate: d(inv.interestEndDate),
    firstPaymentDate: d(inv.firstPaymentDate),
    payments: (inv.payments ?? []).map(p => ({ ...p, date: parseImportDate(p.date) ?? p.date })),
  };
}

function formatZodError(error: ZodError): string {
  const messages = error.issues.slice(0, 3).map(issue => {
    const path = issue.path.join(' → ');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  if (error.issues.length > 3) messages.push(`... y ${error.issues.length - 3} errores más`);
  return messages.join('\n');
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function ImportInvestmentsDialog({ existing, onImport, isPro, currentActivePendingCount }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>([]);
  const [filePlatform, setFilePlatform] = useState<string>(FILE_PLATFORM_NONE);
  const [fileCustomPlatform, setFileCustomPlatform] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sheet = sheets[sheetIndex];
  const step: 'idle' | 'review' = sheet ? 'review' : 'idle';

  const reset = () => {
    setError(null); setBusy(false); setFileName(''); setSheets([]); setSheetIndex(0);
    setHeaderRow(0); setMapping([]); setFilePlatform(FILE_PLATFORM_NONE); setFileCustomPlatform('');
  };

  const selectSheet = (all: SheetData[], index: number) => {
    const grid = all[index].grid;
    const header = detectHeaderRow(grid);
    const headers = grid[header] ?? [];
    const width = Math.max(headers.length, ...grid.slice(header, header + 50).map(r => r.length));
    const guessed = guessMapping(headers);
    setSheetIndex(index);
    setHeaderRow(header);
    setMapping(Array.from({ length: width }, (_, i) => guessed[i] ?? null));
  };

  // ── Archivo ────────────────────────────────────────────────────────────
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setError(`El archivo es demasiado grande. Máximo: ${MAX_IMPORT_FILE_SIZE / 1024 / 1024} MB.`);
      return;
    }
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        await importJson(file);
        return;
      }
      const read = await readSpreadsheetFile(file);
      const usable = read.filter(s => s.grid.some(r => r.some(c => c)));
      if (usable.length === 0) throw new Error('El archivo está vacío.');
      const best = pickBestSheet(usable)!;
      setFileName(file.name);
      setSheets(usable);
      selectSheet(usable, usable.indexOf(best));
    } catch (e) {
      if (e instanceof ZodError) setError(`Error de validación:\n${formatZodError(e)}`);
      else setError(e instanceof Error ? e.message : 'No se ha podido leer el archivo.');
    }
  };

  /** JSON exportado desde Crowdfolio: se importa tal cual, sin revisión. */
  const importJson = async (file: File) => {
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error('El archivo no contiene JSON válido.'); }
    if (!Array.isArray(parsed)) throw new Error('El archivo debe contener una lista de inversiones.');
    if (parsed.length > MAX_INVESTMENTS_PER_IMPORT) throw new Error(`Demasiadas inversiones. Máximo: ${MAX_INVESTMENTS_PER_IMPORT}.`);
    const data = (investmentsArraySchema.parse(parsed) as Investment[]).map(normalizeImportedDates);
    setBusy(true);
    const { inserted, failed } = await onImport(data, false);
    setBusy(false);
    setOpen(false);
    reset();
    if (failed > 0) toast.error(`Se han importado ${inserted} y han fallado ${failed}.`);
    else toast.success(t('investments.importSuccess').replace('{n}', String(inserted)));
  };

  // ── Revisión ───────────────────────────────────────────────────────────
  const rows = useMemo(
    () => (sheet ? gridToRows(sheet.grid, headerRow, mapping) : []),
    [sheet, headerRow, mapping],
  );

  const defaultPlatform = useMemo(() => {
    if (filePlatform === FILE_PLATFORM_NONE) return null;
    if (filePlatform === 'other') {
      return fileCustomPlatform.trim() ? { platform: 'other' as Platform, customPlatformName: fileCustomPlatform.trim() } : null;
    }
    return { platform: filePlatform as Platform };
  }, [filePlatform, fileCustomPlatform]);

  const { candidates, withoutName } = useMemo(
    () => buildImportCandidates(rows, existing, { defaultPlatform }),
    [rows, existing, defaultPlatform],
  );

  const toImport = candidates.filter(c => !c.duplicate);
  const slots = isPro ? Infinity : Math.max(0, PLAN_FEATURES.free.investments - currentActivePendingCount);
  const accepted = toImport.slice(0, slots);
  const overLimit = toImport.length - accepted.length;
  const readyCount = accepted.filter(c => c.complete).length;
  const draftCount = accepted.length - readyCount;
  const duplicateCount = candidates.length - toImport.length;

  const platformMapped = mapping.includes('platform');
  const rowsWithoutPlatform = candidates.filter(c => c.missing.includes('investments.field.platform')).length;
  const unmappedImportant = (['projectName', 'amount', 'investmentDate', 'expectedEndDate', 'expectedReturn', 'incomeModel'] as ImportField[])
    .filter(f => !mapping.includes(f) && !(f === 'expectedEndDate' && mapping.includes('termMonths')));

  const setColumnField = (col: number, value: string) => {
    setMapping(prev => prev.map((f, i) => {
      if (i === col) return value === NONE ? null : (value as ImportField);
      return value !== NONE && f === value ? null : f;
    }));
  };

  const confirm = async () => {
    if (accepted.length === 0) return;
    setBusy(true);
    const { inserted, failed } = await onImport(accepted.map(c => c.investment), false);
    setBusy(false);
    if (inserted === 0) {
      setError('No se ha podido guardar ninguna inversión. Inténtalo de nuevo o escríbenos a soporte@crowdfolio.es.');
      return;
    }
    setOpen(false);
    reset();
    const ready = accepted.filter(c => c.complete).length;
    const parts = [
      ready > 0 ? plural(ready, 'lista', 'listas') : '',
      inserted - ready > 0 ? `${inserted - ready} en «Pendientes de completar»` : '',
    ].filter(Boolean);
    if (failed > 0) toast.warning(`${inserted} importadas (${parts.join(', ')}). ${failed} no se han podido guardar.`);
    else toast.success(`${plural(inserted, 'inversión importada', 'inversiones importadas')}: ${parts.join(', ')}.`);
  };

  const headers = sheet?.grid[headerRow] ?? [];
  const exampleFor = (col: number) => {
    for (let r = headerRow + 1; r < Math.min(sheet?.grid.length ?? 0, headerRow + 30); r++) {
      const v = sheet!.grid[r]?.[col]?.trim();
      if (v) return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v;
    }
    return '';
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          {t('investments.import')}
        </Button>
      </DialogTrigger>

      <DialogContent className={`grid-cols-[minmax(0,1fr)] ${step === 'review' ? 'sm:max-w-4xl max-h-[90vh] overflow-y-auto' : 'sm:max-w-md'}`}>
        <DialogHeader>
          <DialogTitle>{t('investments.importTitle')}</DialogTitle>
          <DialogDescription>
            {step === 'idle'
              ? 'Sube el Excel o CSV donde tengas tus inversiones: el tuyo propio o el que descargas de la plataforma. Guardamos todo lo que se entienda y lo que falte lo completas después.'
              : `${fileName}: revisa qué es cada columna y confirma.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}

        {step === 'idle' ? (
          <div className="space-y-3 pt-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xlsm,.csv,.json" className="hidden" onChange={handleFile} />
            <Button className="w-full" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              {t('investments.selectFile')}
            </Button>
            <Button variant="ghost" className="w-full text-sm" onClick={() => { downloadImportTemplate().catch(() => toast.error('No se ha podido descargar la plantilla.')); }}>
              <Download className="mr-2 h-4 w-4" />
              ¿No tienes ninguno? Descarga nuestra plantilla
            </Button>
          </div>
        ) : (
          <div className="space-y-5 min-w-0">
            {/* Hoja */}
            {sheets.length > 1 && (
              <div className="flex items-center gap-3">
                <Label className="shrink-0">Hoja</Label>
                <Select value={String(sheetIndex)} onValueChange={v => selectSheet(sheets, Number(v))}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sheets.map((s, i) => <SelectItem key={i} value={String(i)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Columnas */}
            <section className="space-y-2">
              <h4 className="text-sm font-medium">Qué es cada columna</h4>
              <div className="rounded-lg border divide-y">
                {mapping.map((field, col) => {
                  const title = headers[col]?.trim();
                  const example = exampleFor(col);
                  if (!title && !example) return null;
                  return (
                    <div key={col} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{title || `Columna ${columnLetter(col)}`}</p>
                        {example && <p className="text-xs text-muted-foreground truncate">Ej.: {example}</p>}
                      </div>
                      <Select value={field ?? NONE} onValueChange={v => setColumnField(col, v)}>
                        <SelectTrigger className={`sm:w-64 ${field ? '' : 'text-muted-foreground'}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No importar</SelectItem>
                          {IMPORT_FIELDS.map(f => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {unmappedImportant.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ninguna columna para: {unmappedImportant.map(f => FIELD_LABEL[f].toLowerCase()).join(', ')}. Si el archivo lo tiene, elígelo arriba; si no, lo completarás en cada inversión.
                </p>
              )}
            </section>

            {/* Plataforma del archivo */}
            {(!platformMapped || rowsWithoutPlatform > 0 || filePlatform !== FILE_PLATFORM_NONE) && (
              <section className="space-y-2">
                <Label>{platformMapped ? 'Plataforma de las filas que no la indican' : '¿De qué plataforma son estas inversiones?'}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={filePlatform} onValueChange={setFilePlatform}>
                    <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILE_PLATFORM_NONE}>Sin indicar</SelectItem>
                      {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {filePlatform === 'other' && (
                    <Input placeholder="Nombre (Civislend, Mintos…)" value={fileCustomPlatform} onChange={e => setFileCustomPlatform(e.target.value)} className="sm:w-64" />
                  )}
                </div>
              </section>
            )}

            {/* Resumen */}
            <section className="rounded-lg border divide-y text-sm">
              {readyCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p><span className="font-medium">{plural(readyCount, 'inversión lista', 'inversiones listas')}</span> <span className="text-muted-foreground">con todos los datos.</span></p>
                </div>
              )}
              {draftCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Info className="h-4 w-4 text-blue-500 shrink-0" />
                  <p><span className="font-medium">{plural(draftCount, 'inversión', 'inversiones')} con datos por completar.</span> <span className="text-muted-foreground">Se guardan con lo que tienen y aparecerán en «Pendientes de completar».</span></p>
                </div>
              )}
              {duplicateCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <p>{plural(duplicateCount, 'ya estaba', 'ya estaban')} en tu cartera (misma plataforma, proyecto, importe y fecha): no se repite{duplicateCount === 1 ? '' : 'n'}.</p>
                </div>
              )}
              {withoutName.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <p>{plural(withoutName.length, 'fila', 'filas')} sin nombre de proyecto no se importa{withoutName.length === 1 ? '' : 'n'} (fila{withoutName.length === 1 ? '' : 's'} {withoutName.slice(0, 8).join(', ')}{withoutName.length > 8 ? '…' : ''}).</p>
                </div>
              )}
              {accepted.length === 0 && duplicateCount === 0 && (
                <p className="px-4 py-3 text-muted-foreground">No hay inversiones que importar. Revisa qué columna es el nombre del proyecto.</p>
              )}
            </section>

            {overLimit > 0 && (
              <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-300 text-sm">
                  El plan gratuito permite {PLAN_FEATURES.free.investments} inversiones: se importarán las {accepted.length} primeras y {plural(overLimit, 'quedará fuera', 'quedarán fuera')}.
                  Los pagos aún no están disponibles; si necesitas más, escríbenos a soporte@crowdfolio.es.
                </AlertDescription>
              </Alert>
            )}

            {/* Vista previa */}
            {candidates.length > 0 && <PreviewTable candidates={candidates} accepted={new Set(accepted)} t={t} />}

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={reset} disabled={busy}>Elegir otro archivo</Button>
              <Button onClick={confirm} disabled={busy || accepted.length === 0} className="flex-1">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accepted.length > 0 ? `Importar ${plural(accepted.length, 'inversión', 'inversiones')}` : 'Importar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewTable({ candidates, accepted, t }: { candidates: ImportCandidate[]; accepted: Set<ImportCandidate>; t: (k: string) => string }) {
  const shown = candidates.slice(0, 100);
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">Vista previa</h4>
      <div className="rounded-lg border overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Fila</th>
              <th className="px-3 py-2 font-medium">Proyecto</th>
              <th className="px-3 py-2 font-medium text-right">Importe</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map(c => {
              const inv = c.investment;
              const out = !accepted.has(c);
              return (
                <tr key={c.rowNumber} className={out ? 'opacity-50' : ''}>
                  <td className="px-3 py-2 text-muted-foreground">{c.rowNumber}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{inv.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.platform === 'other' ? inv.customPlatformName ?? '—' : PLATFORMS.find(p => p.value === inv.platform)?.label}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{inv.amount != null ? formatCurrency(inv.amount) : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{inv.investmentDate ? inv.investmentDate.split('-').reverse().join('/') : '—'}</td>
                  <td className="px-3 py-2">
                    {c.duplicate ? (
                      <span className="text-xs text-muted-foreground">Ya en tu cartera</span>
                    ) : out ? (
                      <span className="text-xs text-muted-foreground">Fuera del límite</span>
                    ) : c.complete ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Lista</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.missing.map(m => <Badge key={m} variant="outline" className="text-xs">Falta {t(m).toLowerCase()}</Badge>)}
                      </div>
                    )}
                    {c.warnings.length > 0 && !c.duplicate && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{c.warnings.join(' · ')}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {candidates.length > shown.length && (
        <p className="text-xs text-muted-foreground">Se muestran las 100 primeras de {candidates.length}.</p>
      )}
    </section>
  );
}
