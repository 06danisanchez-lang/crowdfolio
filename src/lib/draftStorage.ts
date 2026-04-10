const VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const VALID_PLATFORMS = [
  'urbanitae', 'housers', 'estateguru', 'crowdcube',
  'brickstarter', 'wecity', 'other',
] as const;

const VALID_STATUSES = [
  'draft', 'active', 'pending', 'completed', 'defaulted',
] as const;

export interface DraftFormValues {
  platform?: string;
  customPlatformName?: string;
  projectName?: string;
  amount?: number;
  expectedReturn?: number;
  status: string;
  notes?: string;
  investmentDate: string;   // ISO via .toISOString()
  expectedEndDate?: string; // ISO via .toISOString(), optional
  incomeModel?: string;
  paymentFrequency?: string;
  principalReturnType?: string;
}

export interface DraftPayload {
  version: number;
  updatedAt: string;
  entryMode: 'manual';
  formValues: DraftFormValues;
}

export const draftKey = (uid: string) =>
  `crowdfolio:new-investment-draft:${uid}`;

export function saveDraft(uid: string, payload: DraftPayload): void {
  try {
    localStorage.setItem(draftKey(uid), JSON.stringify(payload));
  } catch {
    // storage full or unavailable — fail silently
  }
}

export function loadDraft(uid: string): DraftPayload | null {
  try {
    const raw = localStorage.getItem(draftKey(uid));
    if (!raw) return null;

    const p = JSON.parse(raw);

    // 1. version
    if (p.version !== VERSION) {
      clearDraft(uid);
      return null;
    }

    // 2. updatedAt parseable + TTL
    const age = Date.now() - new Date(p.updatedAt).getTime();
    if (isNaN(age) || age > DRAFT_TTL_MS) {
      clearDraft(uid);
      return null;
    }

    // 3. entryMode
    if (p.entryMode !== 'manual') {
      clearDraft(uid);
      return null;
    }

    // 4. formValues present
    const fv = p.formValues;
    if (!fv || typeof fv !== 'object') {
      clearDraft(uid);
      return null;
    }

    // 5. platform enum (if present)
    if (fv.platform !== undefined && !VALID_PLATFORMS.includes(fv.platform)) {
      clearDraft(uid);
      return null;
    }

    // 6. status enum
    if (!VALID_STATUSES.includes(fv.status)) {
      clearDraft(uid);
      return null;
    }

    // 7. investmentDate parseable
    if (
      typeof fv.investmentDate !== 'string' ||
      isNaN(Date.parse(fv.investmentDate))
    ) {
      clearDraft(uid);
      return null;
    }

    // 8. expectedEndDate parseable if present
    if (
      fv.expectedEndDate !== undefined &&
      isNaN(Date.parse(fv.expectedEndDate))
    ) {
      clearDraft(uid);
      return null;
    }

    return p as DraftPayload;
  } catch {
    // corrupted JSON or any other parse error — clear and fail safely
    clearDraft(uid);
    return null;
  }
}

export function clearDraft(uid: string): void {
  try {
    localStorage.removeItem(draftKey(uid));
  } catch {
    // fail silently
  }
}
