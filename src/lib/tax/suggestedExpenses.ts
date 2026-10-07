import { TaxExpenseCategory } from '@/types/tax';

export interface SuggestedExpense {
  id: string;
  category: TaxExpenseCategory;
  title: string;
  description: string;
  hint: string;
  examples: string[];
  icon: 'percent' | 'briefcase' | 'calculator' | 'car' | 'file';
}

export const SUGGESTED_EXPENSES: SuggestedExpense[] = [
  {
    id: 'custody_administration',
    category: 'custody',
    title: 'Administración y depósito',
    description: 'Gastos de administración y depósito',
    hint: 'Mantenimiento y custodia de la cuenta inversora',
    examples: [],
    icon: 'file',
  },
  {
    id: 'platform_fee_management',
    category: 'platform_fees',
    title: 'Comisión de gestión anual',
    description: 'Comisión de gestión',
    hint: 'Confírmalo con tu asesor: puede no ser deducible',
    examples: ['Urbanitae', 'Wecity', 'Housers', 'Estateguru'],
    icon: 'percent',
  },
  {
    id: 'platform_fee_success',
    category: 'platform_fees',
    title: 'Comisión de éxito',
    description: 'Comisión de éxito sobre beneficios',
    hint: 'Confírmalo con tu asesor: puede no ser deducible',
    examples: ['Housers', 'Estateguru', 'Urbanitae'],
    icon: 'percent',
  },
];

// Art. 26.1.a LIRPF: en los rendimientos del capital mobiliario solo se restan
// los gastos de administración y depósito de valores negociables.
export const DEDUCTIBLE_INFO = {
  allowed: [
    'Gastos de administración y depósito (custodia, mantenimiento de cuenta)',
  ],
  toConfirm: [
    'Comisiones de las plataformas: depende de si cuentan como administración y depósito. Confírmalo con tu asesor',
  ],
  notAllowed: [
    'Asesoría fiscal o legal',
    'Desplazamientos para visitar inmuebles',
    'Herramientas de seguimiento de cartera (Crowdfolio incluido)',
    'Gestión discrecional de carteras',
    'Gastos de financiación propia (préstamos personales)',
    'Pérdidas por impago (van como pérdida patrimonial, no como gasto)',
  ],
};
