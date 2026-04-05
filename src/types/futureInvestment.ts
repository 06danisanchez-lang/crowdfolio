import { Platform } from './investment';

export interface FutureInvestment {
  id: string;
  platform: Platform;
  customPlatformName?: string;
  projectName: string;
  estimatedAmount: number | null;
  expectedReturn: number | null;
  estimatedOpenDate?: string;
  estimatedEndDate?: string;
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
