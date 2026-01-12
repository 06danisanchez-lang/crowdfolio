import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Platform, InvestmentStatus } from '@/types/investment';

export interface ExtractedInvestmentData {
  platform?: Platform;
  customPlatformName?: string;
  projectName?: string;
  amount?: number;
  expectedReturn?: number;
  investmentDate?: string;
  expectedEndDate?: string;
  status?: InvestmentStatus;
  notes?: string;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedInvestmentData;
  error?: string;
}

export function useInvestmentExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInvestmentData | null>(null);

  const extractFromImage = useCallback(async (imageBase64: string): Promise<ExtractionResult> => {
    setIsExtracting(true);
    setExtractedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('extract-investment-from-image', {
        body: { imageBase64 }
      });

      if (error) {
        console.error('Extraction error:', error);
        toast.error('Error al procesar la imagen');
        return { success: false, error: error.message };
      }

      if (!data.success) {
        const errorMsg = data.error || 'No se pudo extraer información';
        toast.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Validate and normalize the extracted data
      const normalized = normalizeExtractedData(data.data);
      setExtractedData(normalized);
      
      const fieldsExtracted = Object.values(normalized).filter(v => v !== undefined && v !== null).length;
      toast.success(`Se extrajeron ${fieldsExtracted} campos de la imagen`);
      
      return { success: true, data: normalized };

    } catch (err) {
      console.error('Extraction failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al analizar la imagen');
      return { success: false, error: errorMsg };
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const clearExtractedData = useCallback(() => {
    setExtractedData(null);
  }, []);

  return {
    isExtracting,
    extractedData,
    extractFromImage,
    clearExtractedData,
  };
}

function normalizeExtractedData(raw: any): ExtractedInvestmentData {
  const validPlatforms: Platform[] = ['urbanitae', 'housers', 'estateguru', 'crowdcube', 'brickstarter', 'wecity', 'other'];
  const validStatuses: InvestmentStatus[] = ['active', 'pending', 'completed', 'defaulted'];

  const result: ExtractedInvestmentData = {};

  // Platform
  if (raw.platform) {
    const platformLower = raw.platform.toLowerCase();
    if (validPlatforms.includes(platformLower as Platform)) {
      result.platform = platformLower as Platform;
    } else {
      result.platform = 'other';
      result.customPlatformName = raw.platform;
    }
  }

  // Custom platform name
  if (raw.customPlatformName && result.platform === 'other') {
    result.customPlatformName = raw.customPlatformName;
  }

  // Project name
  if (raw.projectName && typeof raw.projectName === 'string') {
    result.projectName = raw.projectName.trim();
  }

  // Amount
  if (raw.amount !== undefined && raw.amount !== null) {
    const amount = parseFloat(String(raw.amount).replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      result.amount = amount;
    }
  }

  // Expected return
  if (raw.expectedReturn !== undefined && raw.expectedReturn !== null) {
    const returnVal = parseFloat(String(raw.expectedReturn).replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!isNaN(returnVal) && returnVal >= 0) {
      result.expectedReturn = returnVal;
    }
  }

  // Investment date
  if (raw.investmentDate && isValidDate(raw.investmentDate)) {
    result.investmentDate = raw.investmentDate;
  }

  // Expected end date
  if (raw.expectedEndDate && isValidDate(raw.expectedEndDate)) {
    result.expectedEndDate = raw.expectedEndDate;
  }

  // Status
  if (raw.status) {
    const statusLower = raw.status.toLowerCase();
    if (validStatuses.includes(statusLower as InvestmentStatus)) {
      result.status = statusLower as InvestmentStatus;
    }
  }

  // Notes
  if (raw.notes && typeof raw.notes === 'string') {
    result.notes = raw.notes.trim();
  }

  return result;
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}
