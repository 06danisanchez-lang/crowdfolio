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
// null), cuya prop `investment` va cambiando de inversión con el tiempo.
function Harness({ investments }: { investments: Investment[] }) {
  const [id, setId] = useState<string | null>(null);
  const investment = investments.find((i) => i.id === id) ?? null;
  return (
    <LanguageProvider>
      <button onClick={() => setId(investments[0].id)}>open-first</button>
      <button onClick={() => setId(investments[1].id)}>open-second</button>
      <DefaultLossQuestionnaire
        key={investment?.id ?? 'none'}
        investment={investment}
        onClose={() => setId(null)}
        onUpdate={async () => ({ demotedToDraft: false })}
      />
    </LanguageProvider>
  );
}

describe('DefaultLossQuestionnaire — remontaje al cambiar de inversión', () => {
  afterEach(cleanup);

  it('tras cerrar el cuestionario de una inversión equity, abrirlo para una no equity sin pagos muestra P0, no un cuerpo vacío', async () => {
    const equityInv = makeInvestment({ id: 'equity-1', incomeModel: 'equity' });
    const bulletInv = makeInvestment({ id: 'bullet-1', incomeModel: 'bullet', payments: [] });

    render(<Harness investments={[equityInv, bulletInv]} />);

    // 1) Se abre para la inversión equity: se ve el texto T9, sin preguntas.
    fireEvent.click(screen.getByText('open-first'));
    expect(await screen.findByText(/participación en el capital/i)).toBeTruthy();

    // 2) Se confirma — dispara handleConfirm → reset() (con isEquity=true en
    // ese instante) → onClose(). Es justo la secuencia que dejaba el `step`
    // obsoleto en 'equity' antes del fix.
    fireEvent.click(screen.getByText('Confirmar'));
    await screen.findByText('open-first'); // sigue montado el harness; el diálogo se cierra

    // 3) Se abre para una inversión "Pago único" (bullet) sin pagos.
    fireEvent.click(screen.getByText('open-second'));

    // Antes del fix: el diálogo quedaba con el `step` obsoleto 'equity' y no
    // pintaba ninguna pregunta (solo título). Con el fix (key por inversión
    // en InvestmentList.tsx), debe verse la pregunta P0.
    expect(await screen.findByText('¿Has recuperado algo de esta inversión?')).toBeTruthy();
  });

  it('abrir directamente una inversión no equity (sin pasar antes por equity) también muestra P0', async () => {
    const bulletInv = makeInvestment({ id: 'bullet-2', incomeModel: 'bullet', payments: [] });
    const otherInv = makeInvestment({ id: 'bullet-3', incomeModel: 'bullet', payments: [] });
    render(<Harness investments={[bulletInv, otherInv]} />);

    fireEvent.click(screen.getByText('open-first'));
    expect(await screen.findByText('¿Has recuperado algo de esta inversión?')).toBeTruthy();
  });
});
