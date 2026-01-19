export type Platform = 
  | 'urbanitae'
  | 'housers'
  | 'estateguru'
  | 'crowdcube'
  | 'brickstarter'
  | 'wecity'
  | 'other';

export type View = 'dashboard' | 'investments' | 'opportunities' | 'platforms' | 'tax' | 'settings' | 'admin';

export type InvestmentStatus = 'active' | 'pending' | 'completed' | 'defaulted';

export interface Payment {
  id: string;
  date: string;
  amount: number;
  type: 'dividend' | 'principal' | 'interest';
  notes?: string;
}

export interface Investment {
  id: string;
  platform: Platform;
  customPlatformName?: string;
  projectName: string;
  amount: number;
  investmentDate: string;
  expectedEndDate?: string;
  expectedReturn: number; // percentage
  status: InvestmentStatus;
  payments: Payment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalReturns: number;
  expectedReturns: number;
  activeInvestments: number;
  completedInvestments: number;
  averageReturn: number;
  byPlatform: Record<Platform, { invested: number; returns: number; count: number }>;
  byStatus: Record<InvestmentStatus, number>;
}

export const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: 'urbanitae', label: 'Urbanitae', color: 'platform-urbanitae' },
  { value: 'housers', label: 'Housers', color: 'platform-housers' },
  { value: 'estateguru', label: 'Estateguru', color: 'platform-estateguru' },
  { value: 'crowdcube', label: 'Crowdcube', color: 'platform-crowdcube' },
  { value: 'brickstarter', label: 'Brickstarter', color: 'platform-brickstarter' },
  { value: 'wecity', label: 'Wecity', color: 'platform-wecity' },
  { value: 'other', label: 'Otra', color: 'platform-other' },
];

export const STATUS_OPTIONS: { value: InvestmentStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Activo', color: 'status-active' },
  { value: 'pending', label: 'Pendiente', color: 'status-pending' },
  { value: 'completed', label: 'Completado', color: 'status-completed' },
  { value: 'defaulted', label: 'Impago', color: 'status-defaulted' },
];
