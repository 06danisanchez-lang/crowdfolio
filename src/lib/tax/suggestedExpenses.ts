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
    id: 'platform_fee_management',
    category: 'platform_fees',
    title: 'Comisión de gestión anual',
    description: 'Comisión de gestión',
    hint: 'Típico: 1-2% del capital invertido anualmente',
    examples: ['Urbanitae', 'Wecity', 'Housers', 'Estateguru'],
    icon: 'percent',
  },
  {
    id: 'platform_fee_success',
    category: 'platform_fees',
    title: 'Comisión de éxito',
    description: 'Comisión de éxito sobre beneficios',
    hint: 'Se cobra sobre los beneficios distribuidos (10-20% típico)',
    examples: ['Housers', 'Estateguru', 'Urbanitae'],
    icon: 'percent',
  },
  {
    id: 'platform_fee_entry',
    category: 'platform_fees',
    title: 'Comisión de entrada',
    description: 'Fee de entrada por inversión',
    hint: 'Comisión cobrada al realizar la inversión',
    examples: ['Wecity', 'Brickstarter'],
    icon: 'percent',
  },
  {
    id: 'advisory_tax',
    category: 'advisory',
    title: 'Asesoría fiscal',
    description: 'Honorarios asesoría fiscal IRPF',
    hint: 'Parte proporcional dedicada a rentas del ahorro',
    examples: [],
    icon: 'briefcase',
  },
  {
    id: 'advisory_legal',
    category: 'advisory',
    title: 'Consulta legal',
    description: 'Consulta legal inversiones crowdfunding',
    hint: 'Reclamaciones, revisión de contratos, etc.',
    examples: [],
    icon: 'briefcase',
  },
  {
    id: 'management_tools',
    category: 'management',
    title: 'Herramientas de gestión',
    description: 'Suscripción herramienta tracking inversiones',
    hint: 'Software o servicios de agregación de carteras',
    examples: [],
    icon: 'calculator',
  },
  {
    id: 'travel_visit',
    category: 'travel',
    title: 'Visita a promoción',
    description: 'Desplazamiento visita inmueble',
    hint: 'Solo para inversiones en equity inmobiliario',
    examples: [],
    icon: 'car',
  },
  {
    id: 'other_custody',
    category: 'other',
    title: 'Gastos de custodia',
    description: 'Gastos de custodia y administración',
    hint: 'Comisiones de mantenimiento de cuenta inversora',
    examples: [],
    icon: 'file',
  },
];

export const DEDUCTIBLE_INFO = {
  allowed: [
    'Comisiones de las plataformas (gestión, éxito, entrada)',
    'Gastos de asesoría fiscal o legal relacionados',
    'Costes de custodia y administración',
    'Gastos de desplazamiento para visitar inmuebles (equity)',
  ],
  notAllowed: [
    'Gastos de financiación propia (préstamos personales)',
    'Pérdidas por impago (van como pérdida patrimonial, no gasto)',
    'Gastos no directamente relacionados con la inversión',
  ],
};
