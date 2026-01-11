import { Platform, PLATFORMS } from './investment';

export type OpportunityStatus = 'open' | 'coming_soon' | 'closed' | 'funded';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ProjectType = 'residential' | 'commercial' | 'logistics' | 'hotel' | 'mixed' | 'land' | 'other';

export interface Opportunity {
  id: string;
  platform: Platform;
  projectName: string;
  projectType: ProjectType;
  location: string;
  expectedReturn: number; // percentage
  term: number; // months
  minInvestment: number;
  targetAmount: number;
  currentAmount: number;
  fundingProgress: number; // percentage
  status: OpportunityStatus;
  description?: string;
  url?: string;
  riskLevel: RiskLevel;
  imageUrl?: string;
  source: 'scraped' | 'manual';
  scrapedAt?: string;
  isFavorite: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'residential', label: 'Residencial' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'logistics', label: 'Logístico' },
  { value: 'hotel', label: 'Hotelero' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'land', label: 'Suelo' },
  { value: 'other', label: 'Otro' },
];

export const RISK_LEVELS: { value: RiskLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Bajo', color: 'bg-green-500' },
  { value: 'medium', label: 'Medio', color: 'bg-yellow-500' },
  { value: 'high', label: 'Alto', color: 'bg-red-500' },
];

export const OPPORTUNITY_STATUS_OPTIONS: { value: OpportunityStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Abierto', color: 'bg-green-500' },
  { value: 'coming_soon', label: 'Próximamente', color: 'bg-blue-500' },
  { value: 'closed', label: 'Cerrado', color: 'bg-gray-500' },
  { value: 'funded', label: 'Financiado', color: 'bg-primary' },
];

export const SCRAPING_PLATFORMS = PLATFORMS.filter(p => 
  ['urbanitae', 'housers', 'estateguru', 'brickstarter', 'wecity'].includes(p.value)
);

export const PLATFORM_URLS: Record<string, string> = {
  urbanitae: 'https://urbanitae.com/proyectos',
  housers: 'https://housers.com/es/oportunidades',
  estateguru: 'https://estateguru.co/home/marketplace',
  brickstarter: 'https://brickstarter.com/proyectos',
  wecity: 'https://wecity.com/proyectos',
};
