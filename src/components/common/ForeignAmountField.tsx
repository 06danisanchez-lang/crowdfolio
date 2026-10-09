import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseSpanishNumber, formatSpanishNumber } from '@/lib/investment/parseSpanishNumber';
import { fetchExchangeRate } from '@/lib/currency/exchangeRateClient';
import { foreignAmountToEur, formatExchangeRate, type ForeignAmountInput } from '@/lib/currency/fx';
import { format, parseISO } from 'date-fns';

/**
 * Número en formato español ("1.500,50") con el texto en estado local para no
 * reformatear mientras se escribe. Vacío o no interpretable = null.
 */
function SpanishNumberInput({
  id, value, onChange, placeholder, suffix, ariaLabel, maxDecimals = 2,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  suffix?: string;
  ariaLabel?: string;
  maxDecimals?: number;
}) {
  const fmt = (v: number) => (maxDecimals > 2
    ? v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })
    : formatSpanishNumber(v));
  const [text, setText] = useState(value != null ? fmt(value) : '');
  const [error, setError] = useState<string | null>(null);
  const lastEmitted = useRef<number | null>(value);

  // Resincroniza si el valor cambia desde fuera (p. ej. llega el tipo del BCE).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value != null ? fmt(value) : '');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (v: number | null) => { lastEmitted.current = v; onChange(v); };

  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          placeholder={placeholder}
          className={suffix ? 'pr-12' : undefined}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const r = parseSpanishNumber(e.target.value);
            if (!r.error) { setError(null); emit(r.value); }
          }}
          onBlur={() => {
            const r = parseSpanishNumber(text);
            if (r.error) { setError(r.error); emit(null); }
            else { setError(null); emit(r.value); if (r.value != null) setText(fmt(r.value)); }
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface Props {
  /** Divisa del importe (nunca EUR: para euros se usa el campo normal). */
  currency: string;
  /** Fecha de la operación ('YYYY-MM-DD'): se pide el tipo del BCE de ese día. */
  date: string | null;
  value: ForeignAmountInput;
  onChange: (value: ForeignAmountInput) => void;
  amountLabel: string;
  idPrefix: string;
}

/**
 * Importe en otra divisa + tipo de cambio. Propone el tipo de referencia del
 * BCE del día de la operación; si el usuario lo cambia, se respeta ('manual').
 * Debajo enseña cuántos euros son, que es lo que se guarda en `amount`.
 */
export function ForeignAmountField({ currency, date, value, onChange, amountLabel, idPrefix }: Props) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const requestSeq = useRef(0);
  const firstRun = useRef(true);

  const loadEcbRate = (forDate: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setNotice(null);
    fetchExchangeRate(currency, forDate).then((res) => {
      if (seq !== requestSeq.current) return; // llegó tarde: hay otra consulta más nueva
      setLoading(false);
      if (!res.ok || !res.data) { setNotice(res.message ?? 'No se ha podido consultar el BCE. Escribe el tipo a mano.'); return; }
      if (valueRef.current.exchangeRateSource === 'manual') return;
      const data = res.data;
      onChangeRef.current({ ...valueRef.current, exchangeRate: data.rate, exchangeRateDate: data.rateDate, exchangeRateSource: 'ecb' });
      const day = format(parseISO(data.rateDate), 'dd/MM/yyyy');
      setNotice(data.fellBack
        ? `Tipo de referencia del BCE del ${day} (el último publicado antes de esa fecha).`
        : `Tipo de referencia del BCE del ${day}.`);
    });
  };

  // Propone el tipo del BCE al cambiar la divisa o la fecha, salvo que el
  // usuario lo haya escrito a mano. Al abrir algo ya guardado con su tipo, no
  // se vuelve a pedir.
  useEffect(() => {
    const skip = firstRun.current && valueRef.current.exchangeRate != null;
    firstRun.current = false;
    if (skip || !date || valueRef.current.exchangeRateSource === 'manual') return;
    loadEcbRate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, date]);

  const eur = foreignAmountToEur(value);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-original`}>{amountLabel} ({currency})</label>
          <SpanishNumberInput
            id={`${idPrefix}-original`}
            value={value.originalAmount}
            onChange={(v) => onChange({ ...valueRef.current, originalAmount: v })}
            placeholder="1.000,00"
            suffix={currency}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor={`${idPrefix}-rate`}>Tipo de cambio (€ por 1 {currency})</label>
          <SpanishNumberInput
            id={`${idPrefix}-rate`}
            value={value.exchangeRate}
            maxDecimals={6}
            onChange={(v) => {
              requestSeq.current++; // descarta una consulta al BCE en curso
              setLoading(false);
              onChange({ ...valueRef.current, exchangeRate: v, exchangeRateSource: 'manual', exchangeRateDate: date });
            }}
            placeholder={loading ? 'Consultando BCE…' : '1,1500'}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {value.exchangeRateSource === 'manual'
          ? 'Tipo de cambio escrito a mano. '
          : (notice ?? (loading ? 'Consultando el tipo de referencia del BCE…' : 'Se propone el tipo de referencia del BCE de esa fecha.'))}
        {value.exchangeRateSource === 'manual' && date && (
          <button
            type="button"
            className="underline"
            onClick={() => {
              onChange({ ...valueRef.current, exchangeRateSource: null });
              valueRef.current = { ...valueRef.current, exchangeRateSource: null };
              loadEcbRate(date);
            }}
          >
            Usar el del BCE
          </button>
        )}
      </p>
      {eur != null && value.exchangeRate != null && (
        <p className="text-sm">
          = <strong>{eur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong>
          <span className="text-muted-foreground"> ({formatExchangeRate(value.exchangeRate, currency)})</span>
        </p>
      )}
    </div>
  );
}
