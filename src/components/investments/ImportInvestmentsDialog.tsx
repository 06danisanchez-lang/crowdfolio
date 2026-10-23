import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Info, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ZodError } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ImportInvestmentInput, IncomeModel, INCOME_MODEL_OPTIONS, Investment, PaymentFrequency,
  PAYMENT_FREQUENCY_OPTIONS, Platform, PLATFORMS,
} from '@/types/investment';
import { PLAN_FEATURES } from '@/lib/stripe/config';
import { investmentsArraySchema, MAX_IMPORT_FILE_SIZE, MAX_INVESTMENTS_PER_IMPORT } from '@/lib/validation/investmentSchema';
import { parseImportDate } from '@/lib/investment/parseImportDate';
import {
  ColumnMapping, detectHeaderRow, FIELD_LABEL, gridToRows, guessMapping, IMPORT_FIELDS, ImportField,
} from '@/lib/investment/importSheet';
import {
  buildImportCandidates, DateOrder, detectDateOrder, detectFractionReturns, ExistingInvestmentKey, ImportCandidate, selectForImport,
} from '@/lib/investment/importRows';
import { pickBestSheet, readSpreadsheetFile, SheetData } from '@/lib/investment/readSpreadsheet';
import { downloadImportTemplate } from '@/lib/investment/importTemplate';
import { formatCurrency } from '@/lib/tax/calculations';

/**
 * Importar inversiones desde cualquier Excel o CSV.
 *
 * 1. El usuario sube su archivo (el suyo propio, el que descarga de la
 *    plataforma o nuestra plantilla).
 * 2. Proponemos qué es cada columna; él puede corregirlo. Lo que el archivo no
 *    dice (plataforma, tipo de rendimiento, frecuencia) lo puede elegir una
 *    vez para todas las filas.
 * 3. Vista previa: qué inversiones quedan listas y a cuáles les falta algo.
 *    Las repetidas y las finalizadas no se importan salvo que lo pida.
 * 4. Se guarda todo: lo que falta queda en «Pendientes de completar».
 */

interface Props {
  existing: ExistingInvestmentKey[];
  onImport: (investments: ImportInvestmentInput[], replace: boolean) => Promise<{ inserted: number; failed: number }>;
  isPro: boolean;
  currentActivePendingCount: number;
}

const NONE = '__none__';

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
const toDisplayDate = (iso: string) => iso.split('-').reverse().join('/');

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
  // Lo que el usuario elige para las filas que no lo indican
  const [filePlatform, setFilePlatform] = useState<string>(NONE);
  const [fileCustomPlatform, setFileCustomPlatform] = useState('');
  const [fileIncomeModel, setFileIncomeModel] = useState<string>(NONE);
  const [fileFrequency, setFileFrequency] = useState<string>(NONE);
  const [dateOrder, setDateOrder] = useState<DateOrder | null>(null);
  // Qué se importa
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [includeFinished, setIncludeFinished] = useState(false);
  const [includePastDue, setIncludePastDue] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sheet = sheets[sheetIndex];
  const step: 'idle' | 'review' = sheet ? 'review' : 'idle';

  const reset = () => {
    setError(null); setBusy(false); setFileName(''); setSheets([]); setSheetIndex(0);
    setHeaderRow(0); setMapping([]); setFilePlatform(NONE); setFileCustomPlatform('');
    setFileIncomeModel(NONE); setFileFrequency(NONE); setDateOrder(null);
    setIncludeDuplicates(false); setIncludeFinished(false); setIncludePastDue(true);
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
    setDateOrder(null);
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
      setBusy(false);
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
  const detectedOrder = useMemo(() => detectDateOrder(rows), [rows]);
  const returnsAsFraction = useMemo(() => detectFractionReturns(rows), [rows]);
  const effectiveDateOrder = dateOrder ?? detectedOrder.suggested;

  const defaultPlatform = useMemo(() => {
    if (filePlatform === NONE) return null;
    if (filePlatform === 'other') {
      return fileCustomPlatform.trim() ? { platform: 'other' as Platform, customPlatformName: fileCustomPlatform.trim() } : null;
    }
    return { platform: filePlatform as Platform };
  }, [filePlatform, fileCustomPlatform]);

  const { candidates, withoutName } = useMemo(
    () => buildImportCandidates(rows, existing, {
      defaultPlatform,
      defaultIncomeModel: fileIncomeModel === NONE ? null : (fileIncomeModel as IncomeModel),
      defaultFrequency: fileFrequency === NONE ? null : (fileFrequency as PaymentFrequency),
      dateOrder: effectiveDateOrder,
      returnsAsFraction,
    }),
    [rows, existing, defaultPlatform, fileIncomeModel, fileFrequency, effectiveDateOrder, returnsAsFraction],
  );

  const slots = isPro ? Infinity : Math.max(0, PLAN_FEATURES.free.investments - currentActivePendingCount);
  const selection = selectForImport(candidates, { includeDuplicates, includeFinished, includePastDue, slots });
  const { accepted } = selection;
  const acceptedSet = new Set(accepted);
  const readyCount = accepted.filter(c => c.complete).length;
  const draftCount = accepted.length - readyCount;

  const platformMapped = mapping.includes('platform');
  const anyMissing = (field: string) => candidates.some(c => c.missing.includes(field));
  const showPlatformDefault = !platformMapped || anyMissing('investments.field.platform') || filePlatform !== NONE;
  const showModelDefault = anyMissing('investments.field.incomeModel') || fileIncomeModel !== NONE;
  const showFrequencyDefault = anyMissing('investments.field.paymentFrequency') || fileFrequency !== NONE;
  const showDateOrder = detectedOrder.suggested === 'mdy' || detectedOrder.ambiguous || dateOrder !== null;

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
    setError(null);
    const { inserted, failed } = await onImport(accepted.map(c => c.investment), false);
    setBusy(false);
    if (inserted === 0) {
      setError('No se ha podido guardar ninguna inversión. Inténtalo de nuevo o escríbenos a soporte@crowdfolio.es.');
      return;
    }
    setOpen(false);
    reset();
    const parts = [
      readyCount > 0 ? plural(readyCount, 'lista', 'listas') : '',
      draftCount > 0 ? `${draftCount} en «Pendientes de completar»` : '',
    ].filter(Boolean);
    if (failed > 0) toast.warning(`${inserted} importadas. ${failed} no se han podido guardar: vuelve a importar el archivo y saldrán solo las que faltan.`);
    else toast.success(`${plural(inserted, 'inversión importada', 'inversiones importadas')}: ${parts.join(', ')}.`);
  };

  const headers = sheet?.grid[headerRow] ?? [];
  const exampleFor = (col: number) => {
    for (let r = headerRow + 1; r < Math.min(sheet?.grid.length ?? 0, headerRow + 30); r++) {
      const v = sheet!.grid[r]?.[col]?.trim();
      if (v) return /^\d{4}-\d{2}-\d{2}$/.test(v) ? toDisplayDate(v) : v;
    }
    return '';
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={o => { if (busy) return; setOpen(o); if (!o) reset(); }}>
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
            <p className="text-xs text-muted-foreground">
              Se importan las inversiones, no los cobros ya recibidos: esos los registras desde cada inversión.
            </p>
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
              {returnsAsFraction && (
                <p className="text-xs text-muted-foreground">
                  La rentabilidad viene en tanto por uno (0,09): la leemos como porcentaje (9 %). Compruébalo en la vista previa.
                </p>
              )}
              {unmappedImportant.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ninguna columna para: {unmappedImportant.map(f => FIELD_LABEL[f].toLowerCase()).join(', ')}. Si el archivo lo tiene, elígelo arriba.
                </p>
              )}
            </section>

            {/* Formato de fecha */}
            {showDateOrder && (
              <section className="space-y-2">
                <Label>¿Cómo están escritas las fechas?</Label>
                <Select value={effectiveDateOrder} onValueChange={v => setDateOrder(v as DateOrder)}>
                  <SelectTrigger className="sm:w-72"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dmy">Día/mes/año (25/01/2024)</SelectItem>
                    <SelectItem value="mdy">Mes/día/año (01/25/2024)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {detectedOrder.suggested === 'mdy'
                    ? 'Algunas fechas solo tienen sentido como mes/día (Excel en inglés). Comprueba en la vista previa que las fechas son las buenas.'
                    : 'Hay fechas escritas de las dos formas: las que no existen se quedarán vacías para que las pongas tú.'}
                </p>
              </section>
            )}

            {/* Datos para las filas que no los indican */}
            {(showPlatformDefault || showModelDefault || showFrequencyDefault) && (
              <section className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Para las que no lo indican</h4>
                  <p className="text-xs text-muted-foreground">Si todas tus inversiones del archivo comparten un dato, elígelo aquí y te ahorras completarlo una a una.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {showPlatformDefault && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Plataforma</Label>
                      <Select value={filePlatform} onValueChange={setFilePlatform}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin indicar</SelectItem>
                          {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {filePlatform === 'other' && (
                        <Input placeholder="Nombre (Civislend, Mintos…)" value={fileCustomPlatform} onChange={e => setFileCustomPlatform(e.target.value)} />
                      )}
                    </div>
                  )}
                  {showModelDefault && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de rendimiento</Label>
                      <Select value={fileIncomeModel} onValueChange={setFileIncomeModel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin indicar</SelectItem>
                          {INCOME_MODEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {showFrequencyDefault && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Frecuencia de cobro (periódicas)</Label>
                      <Select value={fileFrequency} onValueChange={setFileFrequency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin indicar</SelectItem>
                          {PAYMENT_FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
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
              {selection.duplicates > 0 && (
                <OptionRow
                  checked={includeDuplicates} onChange={setIncludeDuplicates}
                  text={`${plural(selection.duplicates, 'ya está', 'ya están')} en tu cartera (misma plataforma y proyecto, sin importe ni fecha distintos).`}
                  label={selection.duplicates === 1 ? 'Importarla también (si de verdad invertiste dos veces)' : 'Importarlas también (si de verdad invertiste dos veces)'}
                />
              )}
              {selection.finished > 0 && (
                <OptionRow
                  checked={includeFinished} onChange={setIncludeFinished}
                  text={`${plural(selection.finished, 'figura', 'figuran')} como finalizada${selection.finished === 1 ? '' : 's'} en el archivo.`}
                  label={selection.finished === 1 ? 'Importarla también (tendrás que cerrarla con su cobro final)' : 'Importarlas también (tendrás que cerrarlas con su cobro final)'}
                />
              )}
              {selection.pastDue > 0 && (
                <OptionRow
                  checked={includePastDue} onChange={setIncludePastDue}
                  text={`${plural(selection.pastDue, 'tiene', 'tienen')} el vencimiento ya pasado: aparecerán como «Vencida sin cobrar» para que confirmes si cobraste o se ha retrasado.`}
                  label={selection.pastDue === 1 ? 'Importarla' : 'Importarlas'}
                />
              )}
              {withoutName.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <p>{plural(withoutName.length, 'fila', 'filas')} sin nombre de proyecto no se importa{withoutName.length === 1 ? '' : 'n'} (fila{withoutName.length === 1 ? '' : 's'} {withoutName.slice(0, 8).join(', ')}{withoutName.length > 8 ? '…' : ''}).</p>
                </div>
              )}
              {candidates.length === 0 && (
                <p className="px-4 py-3 text-muted-foreground">No hay inversiones que importar. Revisa qué columna es el nombre del proyecto.</p>
              )}
            </section>

            {selection.overLimit > 0 && (
              <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-300 text-sm">
                  El plan gratuito permite {PLAN_FEATURES.free.investments} inversiones: se importarán las {accepted.length} primeras y {plural(selection.overLimit, 'quedará fuera', 'quedarán fuera')}.
                  Los pagos aún no están disponibles; si necesitas más, escríbenos a soporte@crowdfolio.es.
                </AlertDescription>
              </Alert>
            )}

            {/* Vista previa */}
            {candidates.length > 0 && <PreviewTable candidates={candidates} accepted={acceptedSet} t={t} />}

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={reset} disabled={busy}>Elegir otro archivo</Button>
              <Button onClick={confirm} disabled={busy || accepted.length === 0} className="flex-1">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {busy ? 'Importando…' : accepted.length > 0 ? `Importar ${plural(accepted.length, 'inversión', 'inversiones')}` : 'Importar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({ checked, onChange, text, label }: { checked: boolean; onChange: (v: boolean) => void; text: string; label: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="space-y-2">
        <p className="text-muted-foreground">{text}</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={checked} onCheckedChange={v => onChange(v === true)} />
          <span>{label}</span>
        </label>
      </div>
    </div>
  );
}

function rowState(c: ImportCandidate, included: boolean): { text: string; muted: boolean } | null {
  if (included) return null;
  if (c.duplicate) return { text: 'Ya en tu cartera', muted: true };
  if (c.finished) return { text: 'Finalizada', muted: true };
  if (c.pastDue) return { text: 'Vencida', muted: true };
  return { text: 'Fuera del límite', muted: true };
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
              <th className="px-3 py-2 font-medium">Vencimiento</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map(c => {
              const inv = c.investment;
              const excluded = rowState(c, accepted.has(c));
              return (
                <tr key={c.rowNumber} className={excluded ? 'opacity-50' : ''}>
                  <td className="px-3 py-2 text-muted-foreground">{c.rowNumber}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{inv.projectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.platform === 'other' ? inv.customPlatformName ?? 'Sin plataforma' : PLATFORMS.find(p => p.value === inv.platform)?.label}
                      {inv.expectedReturn != null && ` · ${String(inv.expectedReturn).replace('.', ',')} %`}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{inv.amount != null ? formatCurrency(inv.amount) : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{inv.investmentDate ? toDisplayDate(inv.investmentDate) : '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{inv.expectedEndDate ? toDisplayDate(inv.expectedEndDate) : '—'}</td>
                  <td className="px-3 py-2">
                    {excluded ? (
                      <span className="text-xs text-muted-foreground">{excluded.text}</span>
                    ) : c.complete ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Lista</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.missing.map(m => <Badge key={m} variant="outline" className="text-xs">Falta {t(m).toLowerCase()}</Badge>)}
                      </div>
                    )}
                    {c.warnings.length > 0 && !excluded && (
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
