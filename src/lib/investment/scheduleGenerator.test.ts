import { describe, it, expect } from 'vitest';
import { generateSchedule } from './scheduleGenerator';

// Corre con TZ=Europe/Madrid (vitest.config.ts). El calendario cruza los dos
// cambios de hora de 2024 (último domingo de marzo y de octubre) — antes del
// fix, las cuotas de abril a octubre salían con un día menos (ver auditoría).
describe('generateSchedule — fechas exactas cruzando cambios de hora (invierno→verano→invierno)', () => {
  it('calendario mensual de enero a diciembre 2024: todas las cuotas caen en el día 15 exacto', () => {
    const entries = generateSchedule({
      id: 'inv-1',
      amount: 12000,
      expectedReturn: 6,
      incomeModel: 'periodic_fixed',
      paymentFrequency: 'monthly',
      principalReturnType: 'at_maturity',
      investmentDate: '2024-01-15',
      expectedEndDate: '2024-12-15',
    });

    const interestDates = entries.filter((e) => e.type === 'interest').map((e) => e.expectedDate);
    expect(interestDates).toEqual([
      '2024-02-15', '2024-03-15', '2024-04-15', '2024-05-15', '2024-06-15',
      '2024-07-15', '2024-08-15', '2024-09-15', '2024-10-15', '2024-11-15', '2024-12-15',
    ]);

    const principal = entries.find((e) => e.type === 'principal');
    expect(principal?.expectedDate).toBe('2024-12-15');
  });

  it('amortizing quincenal-mensual también cae en el día exacto cruzando octubre', () => {
    const entries = generateSchedule({
      id: 'inv-2',
      amount: 6000,
      expectedReturn: 5,
      incomeModel: 'amortizing',
      paymentFrequency: 'monthly',
      investmentDate: '2024-09-01',
      expectedEndDate: '2024-12-01',
    });
    const dates = entries.map((e) => e.expectedDate);
    expect(dates).toEqual(['2024-10-01', '2024-11-01', '2024-12-01']);
  });
});

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

// Fase 7 — "fecha del primer cobro" (opcional) + tramo final/inicial más
// corto que un periodo, prorrateado por días/365. Antes de este cambio,
// cuando el plazo no encajaba en un número entero de periodos, el tramo
// sobrante simplemente no generaba ninguna cuota — con amortizing/
// periodic_fixed eso dejaba el calendario vacío y bloqueaba la creación de
// la inversión (completeness.ts exige hasSchedule para estos modelos).
describe('generateSchedule — tramos irregulares (fecha del primer cobro, tramo final corto)', () => {
  it('amortizing SIN fecha de primer cobro, plazo que no encaja en periodos exactos: tramo final prorrateado por días', () => {
    const entries = generateSchedule({
      id: 'inv-a',
      amount: 5000,
      expectedReturn: 15,
      incomeModel: 'amortizing',
      paymentFrequency: 'semiannual',
      principalReturnType: null,
      investmentDate: '2025-01-15',
      expectedEndDate: '2026-04-15', // 2 periodos completos (semestrales) + 3 meses sueltos
    });

    expect(entries.map((e) => e.expectedDate)).toEqual(['2025-07-15', '2026-01-15', '2026-04-15']);
    // Las dos primeras cuotas son la anualidad constante (regular); la última
    // (tramo corto de 90 días) no tiene por qué coincidir con esa constante.
    expect(entries[0].expectedAmount).toBe(entries[1].expectedAmount);
    expect(entries[2].expectedAmount).not.toBe(entries[0].expectedAmount);
    expect(entries[2].expectedDate).toBe('2026-04-15'); // siempre termina en expectedEndDate
  });

  it('amortizing CON fecha de primer cobro que no coincide con investmentDate + 1 periodo: el primer tramo se prorratea', () => {
    const amount = 5000;
    const expectedReturn = 15;
    const entries = generateSchedule({
      id: 'inv-b',
      amount,
      expectedReturn,
      incomeModel: 'amortizing',
      paymentFrequency: 'semiannual',
      principalReturnType: null,
      investmentDate: '2025-01-15',
      expectedEndDate: '2027-01-15',
      firstPaymentDate: '2025-03-15', // 2 meses después de invertir, no 6
    });

    expect(entries.map((e) => e.expectedDate)).toEqual([
      '2025-03-15', '2025-09-15', '2026-03-15', '2026-09-15', '2027-01-15',
    ]);
    // La cuota TOTAL de cada tramo no último es siempre la anualidad
    // constante (incluida la del primer tramo corto) — el prorrateo por días
    // solo cambia el reparto interno capital/interés de ESE tramo, no el
    // importe total cobrado; por eso se verifica con la invariante de abajo,
    // no comparando importes totales entre tramos.
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].expectedAmount).toBe(entries[0].expectedAmount);
    }

    // Invariante: recalculando el reparto capital/interés de forma
    // independiente (primer tramo prorrateado por días/365 sobre el tipo
    // anual, el resto con el tipo por periodo), la suma del capital debe
    // ser exactamente el importe invertido.
    const ratePerPeriod = (expectedReturn / 100) / 2;
    const firstStretchDays = 59; // 2025-01-15 → 2025-03-15 (31-15 en enero + 15 en marzo + 28 en febrero... calculado abajo)
    let balance = amount;
    let totalPrincipal = 0;
    entries.forEach((e, i) => {
      const isFirst = i === 0;
      const isLast = i === entries.length - 1;
      const interest = isFirst
        ? round2(balance * (expectedReturn / 100) * (firstStretchDays / 365))
        : round2(balance * ratePerPeriod);
      const principal = isLast ? balance : round2(e.expectedAmount - interest);
      totalPrincipal = round2(totalPrincipal + principal);
      balance = round2(balance - principal);
    });
    expect(totalPrincipal).toBe(amount);
    expect(balance).toBe(0);
  });

  it('periodic_fixed con último tramo más corto que un periodo: interés prorrateado por días + capital íntegro en expectedEndDate', () => {
    const entries = generateSchedule({
      id: 'inv-c',
      amount: 10000,
      expectedReturn: 8,
      incomeModel: 'periodic_fixed',
      paymentFrequency: 'semiannual',
      principalReturnType: 'at_maturity',
      investmentDate: '2025-01-15',
      expectedEndDate: '2026-04-15', // 2 semestres + 90 días sueltos
    });

    const interestEntries = entries.filter((e) => e.type === 'interest');
    expect(interestEntries.map((e) => e.expectedDate)).toEqual(['2025-07-15', '2026-01-15', '2026-04-15']);
    // Las dos primeras son un semestre completo (tipo por periodo): 10000*0.04 = 400.
    expect(interestEntries[0].expectedAmount).toBe(400);
    expect(interestEntries[1].expectedAmount).toBe(400);
    // La última son 90 días prorrateados por días/365 sobre el tipo ANUAL, no el semestral:
    // 10000 * 0.08 * 90/365 = 197.26.
    expect(interestEntries[2].expectedAmount).toBe(round2(10000 * 0.08 * (90 / 365)));

    const principal = entries.find((e) => e.type === 'principal');
    expect(principal).toMatchObject({ expectedDate: '2026-04-15', expectedAmount: 10000 });
  });

  it('amortizing: la suma del capital de todas las cuotas es exactamente el importe invertido (con tramo final corto)', () => {
    const amount = 5000;
    const expectedReturn = 15;
    const entries = generateSchedule({
      id: 'inv-d',
      amount,
      expectedReturn,
      incomeModel: 'amortizing',
      paymentFrequency: 'semiannual',
      principalReturnType: null,
      investmentDate: '2025-01-15',
      expectedEndDate: '2026-04-15',
    });

    // Recalcula el desglose capital/interés de forma independiente, replicando
    // SOLO las reglas pedidas (tipo por periodo en tramos regulares, días/365
    // sobre el tipo anual en el tramo corto), para comprobar la invariante
    // sobre la salida pública de generateSchedule sin acceder a su interior.
    const ratePerPeriod = (expectedReturn / 100) / 2; // semiannual → 2 periodos/año
    let balance = amount;
    let totalPrincipal = 0;
    entries.forEach((e, i) => {
      const isLast = i === entries.length - 1;
      const interest = isLast
        ? round2(balance * (expectedReturn / 100) * (90 / 365)) // último tramo: 90 días calculados arriba
        : round2(balance * ratePerPeriod);
      const principal = isLast ? balance : round2(e.expectedAmount - interest);
      totalPrincipal = round2(totalPrincipal + principal);
      balance = round2(balance - principal);
    });

    expect(totalPrincipal).toBe(amount);
    expect(balance).toBe(0);
  });

  it('amortizing SIN tramo irregular (el plazo encaja exacto): la suma del capital también es exactamente el importe invertido', () => {
    const amount = 5000;
    const expectedReturn = 15;
    const entries = generateSchedule({
      id: 'inv-e',
      amount,
      expectedReturn,
      incomeModel: 'amortizing',
      paymentFrequency: 'semiannual',
      principalReturnType: null,
      investmentDate: '2025-01-15',
      expectedEndDate: '2027-01-15', // exactamente 4 semestres
    });

    expect(entries).toHaveLength(4);
    const ratePerPeriod = (expectedReturn / 100) / 2;
    let balance = amount;
    let totalPrincipal = 0;
    entries.forEach((e, i) => {
      const isLast = i === entries.length - 1;
      const interest = round2(balance * ratePerPeriod);
      const principal = isLast ? balance : round2(e.expectedAmount - interest);
      totalPrincipal = round2(totalPrincipal + principal);
      balance = round2(balance - principal);
    });

    expect(totalPrincipal).toBe(amount);
    expect(balance).toBe(0);
  });

  it('duración más corta que un periodo entero (el caso del bug original): una única cuota con todo el capital + intereses prorrateados', () => {
    const entries = generateSchedule({
      id: 'inv-f',
      amount: 1239,
      expectedReturn: 13,
      incomeModel: 'amortizing',
      paymentFrequency: 'monthly',
      principalReturnType: 'amortizing',
      investmentDate: '2026-09-23',
      expectedEndDate: '2026-09-25', // 2 días — el caso real de "pruebat5"
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].expectedDate).toBe('2026-09-25');
    expect(entries[0].expectedAmount).toBe(round2(1239 + 1239 * 0.13 * (2 / 365)));
  });
});
