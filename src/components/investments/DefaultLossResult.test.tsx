import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DefaultLossResult } from './DefaultLossResult';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { assessDefaultLoss } from '@/lib/tax/defaultLoss';

function renderResult(props: Parameters<typeof DefaultLossResult>[0]) {
  return render(
    <LanguageProvider>
      <DefaultLossResult {...props} />
    </LanguageProvider>,
  );
}

describe('DefaultLossResult', () => {
  afterEach(cleanup);

  it('equity → muestra T9 y el disclaimer, nada más', () => {
    renderResult({ isEquity: true, result: null, projectName: 'Proyecto X', enforcementDate: null });
    expect(screen.getByText(/participación en el capital/i)).toBeTruthy();
    expect(screen.getByText(/no constituye asesoramiento fiscal/i)).toBeTruthy();
  });

  it('no_loss → solo el texto de sin pérdida y el disclaimer', () => {
    const result = assessDefaultLoss({
      incomeModel: 'bullet',
      amountInvested: 1000,
      payments: [{ type: 'principal', amount: 1000, date: '2026-01-01' }],
      lossAssessedAt: '2026-01-01T00:00:00.000Z',
      insolvencyStatus: 'none',
      insolvencyConcludedDate: null,
      quitaAmount: null,
      quitaDate: null,
      enforcementStarted: false,
      enforcementDate: null,
      enforcementInitiator: null,
    });
    renderResult({ isEquity: false, result, projectName: 'Proyecto X', enforcementDate: null });
    expect(screen.getByText(/no tienes pérdida en esta inversión/i)).toBeTruthy();
  });

  // Punto 1/4 de la Fase 4: el aviso de "la inició la plataforma" debe salir
  // también cuando el plazo de 1 año todavía está pendiente (pending_deadline),
  // no solo cuando la pérdida ya es declarable.
  it('ejecución iniciada por la plataforma, plazo pendiente (pending_deadline) → sale el aviso de plataforma', () => {
    const result = assessDefaultLoss(
      {
        incomeModel: 'bullet',
        amountInvested: 1000,
        payments: [],
        lossAssessedAt: '2027-01-15T00:00:00.000Z',
        insolvencyStatus: 'none',
        insolvencyConcludedDate: null,
        quitaAmount: null,
        quitaDate: null,
        enforcementStarted: true,
        enforcementDate: '2026-02-15',
        enforcementInitiator: 'platform',
      },
      new Date('2027-01-15T00:00:00.000Z'), // 11 meses desde la ejecución — todavía pending_deadline
    );
    expect(result.status).toBe('pending_deadline');

    renderResult({
      isEquity: false,
      result,
      projectName: 'Proyecto X',
      enforcementDate: '2026-02-15',
    });

    expect(screen.getByText(/la ejecución la inició la plataforma/i)).toBeTruthy();
    expect(screen.getByText(/todavía no puedes declarar esta pérdida/i)).toBeTruthy();
  });

  it('ejecución iniciada por el propio usuario, plazo pendiente → NO sale el aviso de plataforma', () => {
    const result = assessDefaultLoss(
      {
        incomeModel: 'bullet',
        amountInvested: 1000,
        payments: [],
        lossAssessedAt: '2027-01-15T00:00:00.000Z',
        insolvencyStatus: 'none',
        insolvencyConcludedDate: null,
        quitaAmount: null,
        quitaDate: null,
        enforcementStarted: true,
        enforcementDate: '2026-02-15',
        enforcementInitiator: 'user',
      },
      new Date('2027-01-15T00:00:00.000Z'),
    );
    renderResult({ isEquity: false, result, projectName: 'Proyecto X', enforcementDate: '2026-02-15' });
    expect(screen.queryByText(/la ejecución la inició la plataforma/i)).toBeNull();
  });
});
