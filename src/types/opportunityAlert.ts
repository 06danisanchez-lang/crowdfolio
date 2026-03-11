import { Platform } from './investment';
import { ProjectType, RiskLevel } from './opportunity';

export interface OpportunityAlert {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  opportunityId?: string;
  minReturn?: number;
  maxReturn?: number;
  platforms: Platform[];
  projectTypes: ProjectType[];
  riskLevels: RiskLevel[];
  maxTerm?: number;
  maxMinInvestment?: number;
  locations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityAlertFormData {
  name: string;
  enabled: boolean;
  opportunityId?: string;
  minReturn?: number;
  maxReturn?: number;
  platforms: Platform[];
  projectTypes: ProjectType[];
  riskLevels: RiskLevel[];
  maxTerm?: number;
  maxMinInvestment?: number;
  locations: string[];
}

export const DEFAULT_ALERT_FORM_DATA: OpportunityAlertFormData = {
  name: '',
  enabled: true,
  platforms: [],
  projectTypes: [],
  riskLevels: [],
  locations: [],
};
