import { describe, it, expect } from 'vitest';
import { answersToLossColumns, DefaultLossAnswers } from './answersToLossColumns';

const NOW = new Date('2026-09-24T10:00:00.000Z');

function base(overrides: Partial<DefaultLossAnswers> = {}): DefaultLossAnswers {
  return {
    insolvencyStatus: 'none',
    insolvencyConcludedDate: null,
    quitaAmount: null,
    quitaDate: null,
    enforcementStarted: false,
    enforcementDate: null,
    enforcementInitiator: null,
    ...overrides,
  };
}

describe('answersToLossColumns', () => {
  it('equity (answers = null) → todos los hechos a null, pero lossAssessedAt/lossRulesVersion sí se rellenan', () => {
    const result = answersToLossColumns(null, NOW);
    expect(result).toEqual({
      lossInsolvencyStatus: null,
      lossInsolvencyConcludedDate: null,
      lossQuitaAmount: null,
      lossQuitaDate: null,
      lossEnforcementStarted: null,
      lossEnforcementDate: null,
      lossEnforcementInitiator: null,
      lossAssessedAt: NOW.toISOString(),
      lossRulesVersion: 1,
    });
  });

  it('P1 = No, PQ = No, P3 = No → todo a none/null salvo el estado del concurso', () => {
    const result = answersToLossColumns(base({ insolvencyStatus: 'none' }), NOW);
    expect(result.lossInsolvencyStatus).toBe('none');
    expect(result.lossInsolvencyConcludedDate).toBeNull();
    expect(result.lossQuitaAmount).toBeNull();
    expect(result.lossEnforcementStarted).toBe(false);
    expect(result.lossEnforcementDate).toBeNull();
  });

  it('P1 = No lo sé → lossInsolvencyStatus = unknown', () => {
    const result = answersToLossColumns(base({ insolvencyStatus: 'unknown' }), NOW);
    expect(result.lossInsolvencyStatus).toBe('unknown');
  });

  it('P1 = Sí, P2 = sigue abierto → lossInsolvencyStatus = open, sin fecha de conclusión', () => {
    const result = answersToLossColumns(base({ insolvencyStatus: 'open' }), NOW);
    expect(result.lossInsolvencyStatus).toBe('open');
    expect(result.lossInsolvencyConcludedDate).toBeNull();
  });

  it('P1 = Sí, P2 = ha terminado sin cobrar → conserva la fecha de conclusión', () => {
    const result = answersToLossColumns(
      base({ insolvencyStatus: 'concluded_unpaid', insolvencyConcludedDate: '2026-05-01' }),
      NOW,
    );
    expect(result.lossInsolvencyStatus).toBe('concluded_unpaid');
    expect(result.lossInsolvencyConcludedDate).toBe('2026-05-01');
  });

  it('insolvencyConcludedDate se descarta (a null) si el estado no es concluded_unpaid, aunque venga informada', () => {
    const result = answersToLossColumns(
      base({ insolvencyStatus: 'open', insolvencyConcludedDate: '2026-05-01' }),
      NOW,
    );
    expect(result.lossInsolvencyConcludedDate).toBeNull();
  });

  it('PQ = Sí → conserva importe y fecha de la quita, sea cual sea la respuesta de P1', () => {
    const result = answersToLossColumns(
      base({ insolvencyStatus: 'none', quitaAmount: 5000, quitaDate: '2026-03-10' }),
      NOW,
    );
    expect(result.lossQuitaAmount).toBe(5000);
    expect(result.lossQuitaDate).toBe('2026-03-10');
  });

  it('PQ = No o No lo sé → importe y fecha de la quita a null', () => {
    const result = answersToLossColumns(base({ quitaAmount: null, quitaDate: null }), NOW);
    expect(result.lossQuitaAmount).toBeNull();
    expect(result.lossQuitaDate).toBeNull();
  });

  it('P3 = Sí, la he iniciado yo → enforcementStarted true, initiator user', () => {
    const result = answersToLossColumns(
      base({
        insolvencyStatus: 'unknown',
        enforcementStarted: true,
        enforcementDate: '2025-01-15',
        enforcementInitiator: 'user',
      }),
      NOW,
    );
    expect(result.lossEnforcementStarted).toBe(true);
    expect(result.lossEnforcementDate).toBe('2025-01-15');
    expect(result.lossEnforcementInitiator).toBe('user');
  });

  it('P3 = Sí, la ha iniciado la plataforma → initiator platform', () => {
    const result = answersToLossColumns(
      base({
        insolvencyStatus: 'none',
        enforcementStarted: true,
        enforcementDate: '2025-06-01',
        enforcementInitiator: 'platform',
      }),
      NOW,
    );
    expect(result.lossEnforcementInitiator).toBe('platform');
  });

  it('enforcementDate/enforcementInitiator se descartan (a null) si enforcementStarted es false, aunque vengan informados', () => {
    const result = answersToLossColumns(
      base({
        enforcementStarted: false,
        enforcementDate: '2025-06-01',
        enforcementInitiator: 'platform',
      }),
      NOW,
    );
    expect(result.lossEnforcementDate).toBeNull();
    expect(result.lossEnforcementInitiator).toBeNull();
  });

  it('quita y concurso concluido pueden coexistir (PQ se pregunta siempre)', () => {
    const result = answersToLossColumns(
      base({
        insolvencyStatus: 'concluded_unpaid',
        insolvencyConcludedDate: '2027-02-01',
        quitaAmount: 2000,
        quitaDate: '2025-11-20',
      }),
      NOW,
    );
    expect(result.lossInsolvencyStatus).toBe('concluded_unpaid');
    expect(result.lossInsolvencyConcludedDate).toBe('2027-02-01');
    expect(result.lossQuitaAmount).toBe(2000);
    expect(result.lossQuitaDate).toBe('2025-11-20');
  });

  it('lossAssessedAt usa el "now" pasado y lossRulesVersion siempre es 1', () => {
    const result = answersToLossColumns(base(), NOW);
    expect(result.lossAssessedAt).toBe('2026-09-24T10:00:00.000Z');
    expect(result.lossRulesVersion).toBe(1);
  });
});
