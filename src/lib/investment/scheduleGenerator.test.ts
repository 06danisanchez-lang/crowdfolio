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
