import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Info, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentType, Platform, PLATFORMS } from '@/types/investment';
import { MAX_IMPORT_FILE_SIZE } from '@/lib/validation/investmentSchema';
import { ColumnMapping, detectHeaderRow, gridToRows, guessMapping } from '@/lib/investment/importSheet';
import { DateOrder, detectDateOrder } from '@/lib/investment/importRows';
import { pickBestSheet, readSpreadsheetFile, SheetData } from '@/lib/investment/readSpreadsheet';
import {
  AmountsAre, ImportablePaymentType, nameKey, NoWithholdingMode, PAYMENT_FIELD_LABEL, PAYMENT_IMPORT_FIELDS,
  PAYMENT_TYPE_LABEL, PaymentImportField, PaymentLine, readPaymentLines, ResolvedPayment, resolvePayments,
  suggestMatches, TargetInvestment,
} from '@/lib/payments/importPayments';
import { toDateOnlyString } from '@/lib/dateOnly';

/**
 * Importar cobros ya recibidos (extracto de movimientos o Excel propio).
 * Reglas fiscales en lib/payments/importPayments.ts. Aquí: elegir columnas,
 * decir a qué inversión va cada proyecto, cómo es la retención y revisar.
 */

interface Props {
  targets: TargetInvestment[];
  onImport: (rows: {
    investmentId: string; date: string; amount: number; type: PaymentType; withholdingApplied: number; notes?: string;
  }[]) => Promise<{ inserted: number; failed: number }>;
}

const NONE = '__none__';
const SKIP = '__skip__';
const TYPES = Object.keys(PAYMENT_TYPE_LABEL) as ImportablePaymentType[];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const eur = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
const toDisplayDate = (iso: string) => iso.split('-').reverse().join('/');
const lineKey = (l: PaymentLine) => `${l.rowNumber}|${l.type ?? 'x'}|${l.amount ?? ''}`;

function platformLabel(platform?: Platform | null, custom?: string | null): string {
  if (!platform) return '';
  return platform === 'other' ? custom || 'Otra' : PLATFORMS.find(p => p.value === platform)?.label ?? platform;
}

function columnLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

export function ImportPaymentsDialog({ targets, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping<PaymentImportField>>([]);
  const [filePlatform, setFilePlatform] = useState<string>(NONE);
  const [fileCustomPlatform, setFileCustomPlatform] = useState('');
  const [dateOrder, setDateOrder] = useState<DateOrder | null>(null);
  const [defaultType, setDefaultType] = useState<string>(NONE);
  const [amountsAre, setAmountsAre] = useState<string>(NONE);
  const [noWithholdingMode, setNoWithholdingMode] = useState<string>(NONE);
  const [investmentChoice, setInvestmentChoice] = useState<Record<string, string>>({});
  const [typeChoice, setTypeChoice] = useState<Record<string, ImportablePaymentType | 'skip'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sheet = sheets[sheetIndex];
  const step: 'idle' | 'review' = sheet ? 'review' : 'idle';

  const reset = () => {
    setError(null); setBusy(false); setFileName(''); setSheets([]); setSheetIndex(0); setHeaderRow(0); setMapping([]);
    setFilePlatform(NONE); setFileCustomPlatform(''); setDateOrder(null); setDefaultType(NONE);
    setAmountsAre(NONE); setNoWithholdingMode(NONE); setInvestmentChoice({}); setTypeChoice({});
  };

  const selectSheet = (all: SheetData[], index: number) => {
    const grid = all[index].grid;
    const header = detectHeaderRow(grid, PAYMENT_IMPORT_FIELDS);
    const headers = grid[header] ?? [];
    const width = Math.max(headers.length, ...grid.slice(header, header + 50).map(r => r.length));
    const guessed = guessMapping(headers, PAYMENT_IMPORT_FIELDS);
    setSheetIndex(index);
    setHeaderRow(header);
    setMapping(Array.from({ length: width }, (_, i) => guessed[i] ?? null));
    setDateOrder(null);
    setTypeChoice({});
  };

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
      const read = (await readSpreadsheetFile(file)).filter(s => s.grid.some(r => r.some(c => c)));
      if (read.length === 0) throw new Error('El archivo está vacío.');
      const best = pickBestSheet(read, PAYMENT_IMPORT_FIELDS)!;
      setFileName(file.name);
      setSheets(read);
      selectSheet(read, read.indexOf(best));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido leer el archivo.');
    }
  };

  // ── Lectura y resolución ───────────────────────────────────────────────
  const rows = useMemo(() => (sheet ? gridToRows(sheet.grid, headerRow, mapping) : []), [sheet, headerRow, mapping]);
  const detectedOrder = useMemo(() => detectDateOrder(rows, ['date']), [rows]);
  const effectiveDateOrder = dateOrder ?? detectedOrder.suggested;
  const defaultPlatform = useMemo(() => {
    if (filePlatform === NONE) return null;
    if (filePlatform === 'other') {
      return fileCustomPlatform.trim() ? { platform: 'other' as Platform, customPlatformName: fileCustomPlatform.trim() } : null;
    }
    return { platform: filePlatform as Platform };
  }, [filePlatform, fileCustomPlatform]);

  const read = useMemo(
    () => readPaymentLines(rows, { dateOrder: effectiveDateOrder, defaultPlatform }),
    [rows, effectiveDateOrder, defaultPlatform],
  );
  const suggestions = useMemo(() => suggestMatches(read.lines, targets), [read.lines, targets]);

  /** Proyectos distintos del archivo, con la inversión propuesta o elegida. */
  const projects = useMemo(() => {
    const map = new Map<string, { key: string; line: PaymentLine; count: number }>();
    for (const l of read.lines) {
      const key = nameKey(l.platform, l.sourceName);
      const cur = map.get(key);
      if (cur) cur.count++;
      else map.set(key, { key, line: l, count: 1 });
    }
    return [...map.values()];
  }, [read.lines]);

  const investmentFor = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of projects) {
      const chosen = investmentChoice[p.key];
      if (chosen === SKIP) out[p.key] = 'skip';
      else if (chosen && chosen !== NONE) out[p.key] = chosen;
      else if (!chosen && suggestions[p.key]) out[p.key] = suggestions[p.key].id;
    }
    return out;
  }, [projects, investmentChoice, suggestions]);

  const resolved = useMemo(() => {
    const typeOverrides: Record<number, ImportablePaymentType | 'skip'> = {};
    read.lines.forEach((l, i) => { const c = typeChoice[lineKey(l)]; if (c) typeOverrides[i] = c; });
    return resolvePayments(read.lines, {
      targets,
      investmentFor,
      typeOverrides,
      defaultType: defaultType === NONE ? null : (defaultType as ImportablePaymentType),
      withholdingKnown: read.withholdingKnown,
      amountsAre: amountsAre === NONE ? null : (amountsAre as AmountsAre),
      noWithholdingMode: noWithholdingMode === NONE ? null : (noWithholdingMode as NoWithholdingMode),
      today: toDateOnlyString(new Date()),
    });
  }, [read, targets, investmentFor, typeChoice, defaultType, amountsAre, noWithholdingMode]);

  const ready = resolved.filter(r => r.status === 'ready');
  const count = (s: ResolvedPayment['status']) => resolved.filter(r => r.status === s).length;
  const totals = ready.reduce(
    (acc, r) => {
      if (r.type === 'interest' || r.type === 'dividend') { acc.income += r.gross!; acc.withholding += r.withholding!; }
      else acc.capital += r.gross!;
      return acc;
    },
    { income: 0, withholding: 0, capital: 0 },
  );

  const needsWithholdingAnswer = read.lines.some(l => l.type === null || l.type === 'interest' || l.type === 'dividend');
  const showTypeDefault = read.lines.some(l => l.type === null && !l.mixed) || defaultType !== NONE;
  const showPlatformDefault = !mapping.includes('platform') || filePlatform !== NONE;
  const showDateOrder = detectedOrder.suggested === 'mdy' || detectedOrder.ambiguous || dateOrder !== null;
  const hasAmountColumn = mapping.includes('amount') || mapping.includes('interestAmount') || mapping.includes('principalAmount');

  const setColumnField = (col: number, value: string) => {
    setMapping(prev => prev.map((f, i) => {
      if (i === col) return value === NONE ? null : (value as PaymentImportField);
      return value !== NONE && f === value ? null : f;
    }));
    setTypeChoice({});
  };

  const confirm = async () => {
    if (ready.length === 0) return;
    setBusy(true);
    setError(null);
    const { inserted, failed } = await onImport(ready.map(r => ({
      investmentId: r.investment!.id,
      date: r.line.date!,
      amount: r.gross!,
      type: r.type!,
      withholdingApplied: r.withholding!,
      notes: r.notes,
    })));
    setBusy(false);
    if (inserted === 0) {
      setError('No se ha podido guardar ningún cobro. Inténtalo de nuevo o escríbenos a soporte@crowdfolio.es.');
      return;
    }
    setOpen(false);
    reset();
    if (failed > 0) toast.warning(`${inserted} cobros importados. ${failed} no se han podido guardar: vuelve a subir el archivo y saldrán solo los que faltan.`);
    else toast.success(`${plural(inserted, 'cobro importado', 'cobros importados')}.`);
  };

  const headers = sheet?.grid[headerRow] ?? [];
  const exampleFor = (col: number) => {
    for (let r = headerRow + 1; r < Math.min(sheet?.grid.length ?? 0, headerRow + 30); r++) {
      const v = sheet!.grid[r]?.[col]?.trim();
      if (v) return /^\d{4}-\d{2}-\d{2}$/.test(v) ? toDisplayDate(v) : v;
    }
    return '';
  };

  const sortedTargets = useMemo(
    () => [...targets].sort((a, b) => (a.projectName ?? '').localeCompare(b.projectName ?? '', 'es')),
    [targets],
  );

  return (
    <Dialog open={open} onOpenChange={o => { if (busy) return; setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar cobros
        </Button>
      </DialogTrigger>

      <DialogContent className={`grid-cols-[minmax(0,1fr)] ${step === 'review' ? 'sm:max-w-4xl max-h-[90vh] overflow-y-auto' : 'sm:max-w-md'}`}>
        <DialogHeader>
          <DialogTitle>Importar cobros recibidos</DialogTitle>
          <DialogDescription>
            {step === 'idle'
              ? 'Sube el extracto de movimientos de tu plataforma o el Excel donde apuntas tus cobros. Solo se guardan los cobros que se entienden con seguridad: lo dudoso lo decides tú antes de importar.'
              : `${fileName}: revisa columnas, proyectos y retención, y confirma.`}
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
            <input ref={fileInputRef} type="file" accept=".xlsx,.xlsm,.csv" className="hidden" onChange={handleFile} />
            <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Seleccionar archivo
            </Button>
            <p className="text-xs text-muted-foreground">
              Las inversiones tienen que estar ya en Crowdfolio: cada cobro se asigna a una de ellas. Los cobros cuentan para tu informe fiscal; revisa la vista previa antes de confirmar.
            </p>
          </div>
        ) : (
          <div className="space-y-5 min-w-0">
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
                        <SelectTrigger className={`sm:w-72 ${field ? '' : 'text-muted-foreground'}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No importar</SelectItem>
                          {PAYMENT_IMPORT_FIELDS.map(f => <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {(!mapping.includes('date') || !hasAmountColumn) && (
                <p className="text-xs text-muted-foreground">
                  Hace falta al menos {[!mapping.includes('date') && PAYMENT_FIELD_LABEL.date.toLowerCase(), !hasAmountColumn && 'un importe'].filter(Boolean).join(' y ')}.
                </p>
              )}
            </section>

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
              </section>
            )}

            {(showPlatformDefault || showTypeDefault) && (
              <section className="space-y-3">
                <h4 className="text-sm font-medium">Para las filas que no lo indican</h4>
                <div className="grid gap-3 sm:grid-cols-2">
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
                  {showTypeDefault && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de cobro</Label>
                      <Select value={defaultType} onValueChange={setDefaultType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sin indicar</SelectItem>
                          {TYPES.map(t => <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Retención */}
            {needsWithholdingAnswer && (
              <section className="space-y-2 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Retención de intereses y dividendos</h4>
                {read.withholdingKnown ? (
                  <>
                    <p className="text-xs text-muted-foreground">El archivo trae la retención. ¿Los importes de los cobros son brutos o netos?</p>
                    <Select value={amountsAre} onValueChange={setAmountsAre}>
                      <SelectTrigger className="sm:w-96"><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin indicar</SelectItem>
                        <SelectItem value="gross">Brutos: la retención se resta aparte</SelectItem>
                        <SelectItem value="net">Netos: la retención ya está descontada</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      El archivo no dice la retención. Las plataformas españolas retienen el 19 % de los intereses. ¿Qué importes trae?
                    </p>
                    <Select value={noWithholdingMode} onValueChange={setNoWithholdingMode}>
                      <SelectTrigger className="sm:w-96"><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin indicar</SelectItem>
                        <SelectItem value="gross19">Brutos; me retuvieron el 19 %</SelectItem>
                        <SelectItem value="net19">Netos; ya descontado el 19 %</SelectItem>
                        <SelectItem value="none">Sin retención (p. ej. plataforma extranjera)</SelectItem>
                      </SelectContent>
                    </Select>
                    {(noWithholdingMode === 'gross19' || noWithholdingMode === 'net19') && (
                      <p className="text-xs text-muted-foreground">
                        Cada cobro queda anotado como «retención calculada» para que la compruebes con el certificado fiscal de la plataforma.
                      </p>
                    )}
                  </>
                )}
              </section>
            )}

            {/* Proyectos → inversiones */}
            {projects.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-medium">A qué inversión va cada proyecto</h4>
                <div className="rounded-lg border divide-y">
                  {projects.map(p => {
                    const sug = suggestions[p.key];
                    const value = investmentChoice[p.key] ?? sug?.id ?? NONE;
                    return (
                      <div key={p.key} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.line.sourceName || 'Sin nombre de proyecto'}</p>
                          <p className="text-xs text-muted-foreground">
                            {[platformLabel(p.line.platform?.platform, p.line.platform?.customPlatformName), plural(p.count, 'cobro', 'cobros')].filter(Boolean).join(' · ')}
                            {!investmentChoice[p.key] && sug?.quality === 'similar' && ' · nombre parecido: compruébalo'}
                          </p>
                        </div>
                        <Select value={value} onValueChange={v => setInvestmentChoice(prev => ({ ...prev, [p.key]: v }))}>
                          <SelectTrigger className={`sm:w-72 ${value === NONE ? 'text-amber-700' : ''}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Elige la inversión…</SelectItem>
                            <SelectItem value={SKIP}>No importar sus cobros</SelectItem>
                            {sortedTargets.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.projectName || 'Sin nombre'} · {platformLabel(t.platform, t.customPlatformName)}
                                {t.investmentDate ? ` · ${toDisplayDate(t.investmentDate)}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Resumen */}
            <section className="rounded-lg border divide-y text-sm">
              {ready.length > 0 && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{plural(ready.length, 'cobro listo', 'cobros listos')}</p>
                    <p className="text-muted-foreground text-xs">
                      {[
                        totals.income > 0 && `Intereses y dividendos: ${eur(totals.income)} brutos, ${eur(totals.withholding)} de retención`,
                        totals.capital > 0 && `Capital y prima devueltos: ${eur(totals.capital)}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              )}
              {[
                [count('needsInvestment'), 'sin inversión asignada'],
                [count('needsType'), 'sin tipo de cobro'],
                [count('needsWithholding'), 'pendientes de la pregunta de retención'],
              ].filter(([n]) => (n as number) > 0).map(([n, text]) => (
                <div key={text as string} className="flex items-center gap-3 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p>{n} {text}: <span className="text-muted-foreground">no se importan hasta que lo resuelvas arriba o en la vista previa.</span></p>
                </div>
              ))}
              {count('duplicate') > 0 && (
                <Row text={`${plural(count('duplicate'), 'ya estaba registrado', 'ya estaban registrados')}: no se repite${count('duplicate') === 1 ? '' : 'n'}.`} />
              )}
              {count('blocked') > 0 && (
                <Row text={`${plural(count('blocked'), 'cobro no se puede importar', 'cobros no se pueden importar')} (motivo en la vista previa).`} />
              )}
              {read.ignoredRows.length > 0 && (
                <Row text={`${plural(read.ignoredRows.length, 'fila no es un cobro', 'filas no son cobros')} (aportaciones, ingresos o retiradas de dinero, comisiones): se ignora${read.ignoredRows.length === 1 ? '' : 'n'}.`} />
              )}
              {read.orphanWithholdingRows.length > 0 && (
                <Row text={`${plural(read.orphanWithholdingRows.length, 'retención', 'retenciones')} sin un único cobro al que asignarla (fila${read.orphanWithholdingRows.length === 1 ? '' : 's'} ${read.orphanWithholdingRows.slice(0, 8).join(', ')}): revísala${read.orphanWithholdingRows.length === 1 ? '' : 's'} en la ficha.`} />
              )}
              {read.lines.length === 0 && (
                <p className="px-4 py-3 text-muted-foreground">No hay cobros que importar. Revisa qué columnas son la fecha y el importe.</p>
              )}
            </section>

            {resolved.length > 0 && (
              <PreviewTable resolved={resolved} typeChoice={typeChoice} onType={(l, v) => setTypeChoice(prev => ({ ...prev, [lineKey(l)]: v }))} />
            )}

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={reset} disabled={busy}>Elegir otro archivo</Button>
              <Button onClick={confirm} disabled={busy || ready.length === 0} className="flex-1">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {busy ? 'Importando…' : ready.length > 0 ? `Importar ${plural(ready.length, 'cobro', 'cobros')}` : 'Importar'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
      <Info className="h-4 w-4 shrink-0" />
      <p>{text}</p>
    </div>
  );
}

const STATUS_TEXT: Partial<Record<ResolvedPayment['status'], string>> = {
  duplicate: 'Ya registrado',
  skipped: 'No se importa',
};

function PreviewTable({ resolved, typeChoice, onType }: {
  resolved: ResolvedPayment[];
  typeChoice: Record<string, ImportablePaymentType | 'skip'>;
  onType: (line: PaymentLine, value: ImportablePaymentType | 'skip') => void;
}) {
  const shown = resolved.slice(0, 150);
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium">Vista previa</h4>
      <div className="rounded-lg border overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Fila</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Inversión</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium text-right">Bruto</th>
              <th className="px-3 py-2 font-medium text-right">Retención</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map(r => {
              const l = r.line;
              const choice = typeChoice[lineKey(l)];
              const dim = r.status === 'duplicate' || r.status === 'skipped' || r.status === 'blocked';
              return (
                <tr key={`${l.rowNumber}-${r.index}`} className={dim ? 'opacity-50' : ''}>
                  <td className="px-3 py-2 text-muted-foreground">{l.rowNumber}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{l.date ? toDisplayDate(l.date) : '—'}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.investment?.projectName ?? l.sourceName ?? '—'}</p>
                    {l.concept && <p className="text-xs text-muted-foreground">{l.concept}</p>}
                  </td>
                  <td className="px-3 py-2 min-w-44">
                    <Select value={choice ?? r.type ?? NONE} onValueChange={v => v !== NONE && onType(l, v as ImportablePaymentType | 'skip')}>
                      <SelectTrigger className={`h-8 text-xs ${r.status === 'needsType' ? 'border-amber-500' : ''}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE} disabled>Elige el tipo…</SelectItem>
                        {TYPES.map(t => <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</SelectItem>)}
                        <SelectItem value="skip">No importar</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{r.gross != null ? eur(r.gross) : l.amount != null ? <span className="text-muted-foreground">{eur(l.amount)}</span> : '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{r.withholding != null ? eur(r.withholding) : '—'}</td>
                  <td className="px-3 py-2">
                    {r.status === 'ready' ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Listo</Badge>
                    ) : (
                      <span className={`text-xs ${dim ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}`}>{STATUS_TEXT[r.status] ?? r.reason}</span>
                    )}
                    {r.warnings.length > 0 && r.status !== 'duplicate' && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{r.warnings.join(' · ')}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {resolved.length > shown.length && <p className="text-xs text-muted-foreground">Se muestran los 150 primeros de {resolved.length}.</p>}
    </section>
  );
}
