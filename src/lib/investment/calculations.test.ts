import { describe, it, expect } from 'vitest';
import { calculateRealizedProfit } from './calculations';
import type { Payment } from '@/types/investment';

const pay = (type: Payment['type'], amount: number): Payment => ({ id: `${type}-${amount}`, type, amount, date: '2026-01-01' });

describe('calculateRealizedProfit', () => {
  it('préstamo: suma solo las rentas cobradas', () => {
    expect(calculateRealizedProfit({ incomeModel: 'bullet', amount: 1000, payments: [pay('principal', 1000), pay('interest', 80)] })).toBe(80);
  });

  it('equity con beneficio: todo lo cobrado menos lo invertido', () => {
    expect(calculateRealizedProfit({ incomeModel: 'equity', amount: 1000, payments: [pay('principal', 1000), pay('dividend', 150)] })).toBe(150);
  });

  it('equity con pérdida: se ve negativa, no 0 €', () => {
    expect(calculateRealizedProfit({ incomeModel: 'equity', amount: 1000, payments: [pay('principal', 800)] })).toBe(-200);
  });

  it('equity rentas: la prima de emisión devuelta cuenta como capital cobrado', () => {
    expect(calculateRealizedProfit({ incomeModel: 'equity', amount: 1000, payments: [pay('capital_return', 100), pay('principal', 900), pay('dividend', 50)] })).toBe(50);
  });
});
