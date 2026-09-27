import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DefaultLossQuestionnaire } from './DefaultLossQuestionnaire';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Investment } from '@/types/investment';

function makeInvestment(overrides: Partial<Investment> & { id: string; incomeModel: Investment['incomeModel'] }): Investment {
  return {
    platform: 'urbanitae',
    projectName: 'Proyecto de prueba',
    amount: 10000,
    investmentDate: '2024-01-01',
    expectedReturn: 8,
    status: 'active',
    payments: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Reproduce exactamente el cableado de InvestmentList.tsx: una única
// instancia de DefaultLossQuestionnaire, cerrada al montar (investment =
// null), con un contador de apertura (questionnaireOpenSeq) que forma parte
// de la `key` para forzar un remontaje fresco en CADA apertura — incluida la
// reapertura de la misma inversión.
function Harness({ investments }: { investments: Investment[] }) {
  const [id, setId] = useState<string | null>(null);
  const [openSeq, setOpenSeq] = useState(0);
  const openQuestionnaire = (newId: string) => {
    setOpenSeq((n) => n + 1);
    setId(newId);
  };
  const investment = investments.find((i) => i.id === id) ?? null;
  return (
    <LanguageProvider>
      <button onClick={() => openQuestionnaire(investments[0].id)}>open-first</button>
      <button onClick={() => openQuestionnaire(investments[1]?.id ?? investments[0].id)}>open-second</button>
      <DefaultLossQuestionnaire
        key={id ? `${id}-${openSeq}` : 'closed'}
        investment={investment}
        onClose={() => setId(null)}
        onUpdate={async () => ({ demotedToDraft: false })}
      />
    </LanguageProvider>
  );
}

describe('DefaultLossQuestionnaire — se reinicia en cada apertura', () => {
  afterEach(cleanup);

  it('misma inversión (mismo id): equity → cerrar → cambia a préstamo → reabrir debe mostrar P0', async () => {
    const equityVersion = makeInvestment({ id: 'inv-prueba', incomeModel: 'equity' });
    const { rerender } = render(<Harness investments={[equityVersion]} />);

    fireEvent.click(screen.getByText('open-first'));
    expect(await screen.findByText(/participación en el capital/i)).toBeTruthy();

    // Confirma (equivale a cerrar tras guardar).
    fireEvent.click(screen.getByText('Confirmar'));
    await screen.findByText('open-first');

    // La MISMA inversión (mismo id) cambia de modelo de ingreso a "Pago único".
    const loanVersion = makeInvestment({ id: 'inv-prueba', incomeModel: 'bullet', payments: [] });
    rerender(<Harness investments={[loanVersion]} />);

    fireEvent.click(screen.getByText('open-first'));
    expect(await screen.findByText('¿Has recuperado algo de esta inversión?')).toBeTruthy();
  });

  it('préstamo: avanza hasta P1 y selecciona una respuesta, cierra sin confirmar (X) y reabrir empieza en P0 sin respuestas', async () => {
    const loanInv = makeInvestment({ id: 'inv-loan', incomeModel: 'bullet', payments: [] });
    render(<Harness investments={[loanInv]} />);

    fireEvent.click(screen.getByText('open-first'));
    await screen.findByText('¿Has recuperado algo de esta inversión?');
    fireEvent.click(screen.getByText('Continuar')); // P0 → P1
    await screen.findByText('¿La sociedad que recibió el préstamo está en concurso de acreedores?');
    fireEvent.click(screen.getByText('Sí')); // selecciona una respuesta en P1, sin pulsar Continuar

    fireEvent.click(screen.getByText('Close')); // cierra sin confirmar (X de Radix)
    await screen.findByText('open-first');

    // Reabre la MISMA inversión.
    fireEvent.click(screen.getByText('open-first'));
    expect(await screen.findByText('¿Has recuperado algo de esta inversión?')).toBeTruthy();

    // Si la respuesta anterior ('Sí') se hubiera conservado, pulsar Continuar
    // sin seleccionar nada avanzaría a P2 en vez de mostrar el error de
    // validación — así se comprueba que también se reinician las respuestas,
    // no solo el paso.
    fireEvent.click(screen.getByText('Continuar')); // P0 → P1 de nuevo
    await screen.findByText('¿La sociedad que recibió el préstamo está en concurso de acreedores?');
    fireEvent.click(screen.getByText('Continuar'));
    expect(await screen.findByText('Selecciona una opción.')).toBeTruthy();
  });

  it('inversiones distintas: cerrar el cuestionario de una equity y abrir una "Pago único" sin pagos muestra P0', async () => {
    const equityInv = makeInvestment({ id: 'equity-1', incomeModel: 'equity' });
    const bulletInv = makeInvestment({ id: 'bullet-1', incomeModel: 'bullet', payments: [] });

    render(<Harness investments={[equityInv, bulletInv]} />);

    fireEvent.click(screen.getByText('open-first'));
    expect(await screen.findByText(/participación en el capital/i)).toBeTruthy();

    fireEvent.click(screen.getByText('Confirmar'));
    await screen.findByText('open-first');

    fireEvent.click(screen.getByText('open-second'));
    expect(await screen.findByText('¿Has recuperado algo de esta inversión?')).toBeTruthy();
  });
});
